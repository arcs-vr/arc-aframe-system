# ARCS A-Frame System & Component

[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

This A-Frame component connects a VR experience to a second device and proxies all appropriate events to the A-Frame app.

## Installation

Use one of the following:

```bash
yarn add arcs-vr/arc-aframe-system
npm install arcs-vr/arc-aframe-system
```

## Usage

### Setup

```js
import 'arc-aframe-system'
```

```html
<a-scene arc-system="
           host: test.mosquitto.org;
           port: 8081;
           protocol: wss;
           app: arcs-demo-app;
        "
/>
```

### Start the connection

Every controller device needs a unique name for the MQTT broker. Create one and pass it to the `arcs-connect` event.

```js
const scene = document.querySelector('a-scene')

scene.emit('arcs-connect', {
  deviceName: 'yellow-grumpy-duck'
})
```

Your devices are now ready to share events.

### Activate And Deactivate Event Types

In order to minify the amount of transferred data, you need to specify which types of events your VR Experience can process.
Activated events that fire on the remote control device will be transferred and dispatched on the VR Experience's `window`. 

Either do this using the `arcs-connect` event:

```js
const scene = document.querySelector('a-scene')

scene.emit('arcs-connect', {
  deviceName: 'yellow-grumpy-duck',
  events: ['keydown', 'keyup', 'click']
})
```

Or later with more flexibility:

```js
const scene = document.querySelector('a-scene')

scene.emit('arc-remote-add-listener', {
  events: ['keydown']
})

scene.emit('arc-remote-remove-listener', {
  events: ['keyup']
})
```

## More

Look at the [`arcs-vr/arc-aframe-vue-template`](https://github.com/arcs-vr/arc-aframe-vue-template) for easier setup and at the
[`arcs-vr/arc-demo`](https://github.com/arcs-vr/arc-demo) for example usage.

## Authors and contributors

- Barthélémy Bonhomme, [@barthy-koeln](https://github.com/barthy-koeln/): [post@barthy.koeln](mailto:post@barthy.koeln)
