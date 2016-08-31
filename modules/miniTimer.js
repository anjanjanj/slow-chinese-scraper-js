export default class MiniTimer {
  constructor() {
    this.startTime = Date.now();
  }

  elapsed() {
    return ((Date.now() - this.startTime)/1000);
  }
}
