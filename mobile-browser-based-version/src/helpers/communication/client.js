export class Client {
  constructor(serverURL, task) {
    this.serverURL = serverURL;
    this.task = task;
  }

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  async connect() {
    throw new Error('Abstract method');
  }

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  async disconnect() {
    throw new Error('Abstract method');
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochBegin callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochBeginCommunication() {
    return;
  }

  /**
   * The training manager matches this function with the training loop's
   * onEpochEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  async onEpochEndCommunication() {
    return;
  }
}
