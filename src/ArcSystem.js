import { ArcTopics, parsePayload } from 'arc-events'
import { EventDetailError } from './EventDetailError'
import { connectAsync } from 'async-mqtt'

/**
 * A-Frame Remote Controls component, that establishes a connection with a desktop/laptop
 * and streams keyboard/mouse data via WebSockets/MQTT
 *
 * @author Barthy Bonhomme <post@barthy.koeln>
 * @license MIT
 */
export const ArcSystem = {

  schema: {
    /**
     * MQTT/WebSockets protocol (ws|wss)
     */
    protocol: String,

    /**
     * Hostname of the MQTT server
     */
    host: String,

    /**
     * MQTT Port. Typically, 1883 (or 8883 for MQTT over SSL)
     */
    port: Number,
    
    /**
     * App name in case you use a single server for multiple apps
     */
    app: String,

    /**
     * Optional path on the server
     */
    path: String
  },

  /**
   * Initialize all necessary variables, components and functions
   */
  init () {
    /**
     * Pair/Subscription Code
     * @type {string}
     */
    this.paircode = ''

    /**
     * Async MQTT client
     * Async MQTT client
     * @type {AsyncMqttClient}
     */
    this.mqttClient = null

    this.bindFunctions()

    this.el.addEventListener('enter-vr', ArcSystem.enterVRListener)
    this.el.addEventListener('arcs-connect', this.arcsConnectListener)
  },

  /**
   * Bind functions to this component instance
   */
  bindFunctions () {
    this.arcsConnectListener = this.arcsConnectListener.bind(this)
    this.arcsDisconnectListener = this.arcsDisconnectListener.bind(this)
    this.messageListener = this.messageListener.bind(this)
    this.activateEventsListener = this.activateEventsListener.bind(this)
    this.deactivateEventsListener = this.deactivateEventsListener.bind(this)
  },

  /**
   * Blur the active Element and focus the body.
   * The wasd-controls only listen to keyup/keydown events if the body is 'active'.
   */
  enterVRListener () {
    if (document.activeElement !== null && document.activeElement instanceof window.HTMLElement) {
      document.activeElement.blur()
    }

    document.body.focus()
  },

  /**
   * Handle received events based on their type
   *
   * @param {object} payload: MQTT proxy payload
   */
  onPeerData (payload) {
    window.dispatchEvent(parsePayload(payload))
  },

  /**
   * Start the pairing process by connection to the server
   *
   * @param {CustomEvent} event
   * @return {Promise<void>}
   *
   * @throws Error
   */
  async arcsConnectListener (event) {
    this.el.removeEventListener('arcs-connect', this.arcsConnectListener)
    window.addEventListener('beforeunload', this.arcsDisconnectListener)

    if (!Object.prototype.hasOwnProperty.call(event.detail, 'deviceName')) {
      throw new EventDetailError('arcs-connect', 'deviceName', 'string')
    }

    this.paircode = this.data.app + '/' + event.detail.deviceName.replace(' ', '-').toLowerCase()

    this.mqttClient = await connectAsync(`${this.data.protocol}://${this.data.host}:${this.data.port}${this.data.path ?? ''}`)
    this.mqttClient.on('message', this.messageListener)

    await this.mqttClient.subscribe(this.paircode + '/' + ArcTopics.STATUS)
    await this.mqttClient.subscribe(this.paircode + '/' + ArcTopics.DATA)
    await this.mqttClient.publish(
      this.paircode + '/' + ArcTopics.STATUS,
      JSON.stringify({
        type: 'vr',
        connected: true
      }),
      {
        qos: 2
      }
    )

    if (event.detail.events) {
      await this.activateEventsListener(event)
    }

    this.el.addEventListener('arc-remote-add-listener', this.activateEventsListener)
    this.el.addEventListener('arc-remote-remove-listener', this.deactivateEventsListener)
    this.el.addEventListener('arcs-disconnect', this.arcsDisconnectListener)
  },

  /**
   * Unsubscribe, send a disconnection notice and disconnect
   * @return {Promise<void>}
   * */
  async arcsDisconnectListener () {
    this.el.removeEventListener('arcs-disconnect', this.arcsDisconnectListener)
    window.removeEventListener('beforeunload', this.arcsDisconnectListener)

    await this.mqttClient.unsubscribe(this.paircode + '/' + ArcTopics.DATA)
    await this.mqttClient.unsubscribe(this.paircode + '/' + ArcTopics.STATUS)

    await this.mqttClient.publish(
      this.paircode + '/' + ArcTopics.STATUS,
      JSON.stringify({
        type: 'vr',
        connected: false
      }),
      {
        qos: 2
      }
    )

    await this.mqttClient.end()
    this.el.addEventListener('arcs-connect', this.arcsConnectListener)
  },

  /**
   * Perform a handshake between VR and Remote, or proxy the data if already done
   *
   * @param {string} topic: MQTT topic subscribed to
   * @param {ArrayBuffer} payload: MQTT message data
   *
   * @return {Promise<void>}
   */
  async messageListener (topic, payload) {
    const topicPath = topic.split('/')
    const subTopic = topicPath[topicPath.length - 1]
    const message = JSON.parse(payload.toString())

    switch (subTopic) {
      case ArcTopics.STATUS:
        if (message.type === 'remote') {
          if (message.connected) {
            this.el.emit('arc-remote-connected')
          }
        }
        break
      case ArcTopics.DATA:
        this.onPeerData(message)
        break
    }
  },

  /**
   * Activate all requested event listeners
   * @param {CustomEvent} event
   * @return Promise<void>
   */
  async activateEventsListener (event) {
    if (!('events' in event.detail)) {
      throw new EventDetailError('arc-remote-add-listener', 'events', 'array<string>')
    }

    for (const type of event.detail.events) {
      this.activateEvents(type)
    }
  },

  /**
   * Activate a single requested event listener
   * @param {string} type
   */
  activateEvents (type) {
    console.debug('Activate event: ' + type)
    if (!this.mqttClient || this.mqttClient.connected === false) {
      console.debug('MQTT not connected.')
      return
    }

    this.mqttClient.publish(
      this.paircode + '/' + ArcTopics.ADD_EVENT_LISTENER,
      JSON.stringify({ type: type }),
      {
        qos: 2
      }
    )
  },

  /**
   * Deactivate all requested event listeners
   * @param {CustomEvent} event
   * @return Promise<void>
   */
  async deactivateEventsListener (event) {
    if (!('events' in event.detail)) {
      throw new EventDetailError('arc-remote-remove-listener', 'events', 'array<string>')
    }

    for (const type of event.detail.events) {
      this.deactivateEvents(type)
    }
  },

  /**
   * Deactivate a single requested event listener
   * @param {string} type
   */
  deactivateEvents (type) {
    console.debug('Deactivate event: ' + type)
    if (!this.mqttClient || this.mqttClient.connected === false) {
      console.debug('MQTT not connected.')
      return
    }

    this.mqttClient.publish(
      this.paircode + '/' + ArcTopics.REMOVE_EVENT_LISTENER,
      JSON.stringify({ type: type }),
      {
        qos: 2
      }
    )
  }
}
