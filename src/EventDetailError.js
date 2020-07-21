/**
 * Class that logs a comprehensive error for malformed event details
 *
 * @author Barthy Bonhomme <post@barthy.koeln>
 * @license MIT
 */
export class EventDetailError extends Error {
  /**
   *
   * @param {String} event
   * @param {String} property
   * @param {String} expected
   */
  constructor (event, property, expected) {
    super()

    this.message = [
      `When dispatching the '${event}' event,`,
      `you need to pass a 'detail' object that has a '${property}' property (typeof ${expected}).`,
      'Read about event data here: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail'
    ].join(' ')
  }
}
