const WINDOW_SIZE = 4;
const WINDOW_DURATION_BOUNDARY = 0.25;

class ConcurrencyMaximizer {
  
  constructor(windowSize, windowFlexibility) {
    this.concurrency = 1;
    this._ignoreNext = 0;
    this._window = [];
    this._targetWindowDuration = 0;
    this._smallestTargetWindowDuration = Number.MAX_SAFE_INTEGER;
    this._windowSize = windowSize || WINDOW_SIZE;
    this._windowFlexibility = windowFlexibility || WINDOW_DURATION_BOUNDARY;
  }

  startItem() {
    let startTime = this.time();
    return () => this.processWindow(this.time() - startTime);
  }

  blendWindow(duration, blendAmount) {
    this._targetWindowDuration = (duration * blendAmount) + (this._targetWindowDuration * (1 - blendAmount));
  }

  processWindow(duration) {
    if (this._ignoreNext > 0) {
      this._ignoreNext--;
      return;
    }

    this._window.push(duration);
    if (this._window.length >= this._windowSize) {
      // we are (likely) going to adjust concurrency.  In order to get a pure measurement without doing
      // tons of crazy math, we can just skip the next N number of responses.  Unless one response takes 
      // an unusually long amount of time, this should be a good way to isolate this new experiment
      this._ignoreNext = this.concurrency + 1;

      let duration = this._window.reduce((agg, d) => agg + d, 0) / this._windowSize;
      this._smallestTargetWindowDuration = Math.min(duration, this._smallestTargetWindowDuration);
      
      // if we have a new fastest window, reset it and bump our concurrency
      if (duration < this._targetWindowDuration || !this._targetWindowDuration) {
        if (!this._targetWindowDuration) {
          this.concurrency++;
        }
        // things have sped up but are doing multiple things at once... 
        // that means other workers probably eased off - so back off to get a better
        // read of the situation
        else if (this.concurrency > 1 && duration < this._targetWindowDuration * (1 - this._windowFlexibility/2)) {
          this.concurrency = Math.floor(this.concurrency / 2);
        }
        else if (this.concurrency > 1) {
          this.concurrency++;
        }
        this._targetWindowDuration = duration;
        this._lastGoodConcurrency = this.concurrency;
      }
      // if we are at concurrency of "1" and are slower than our "fastest" time,
      // set the target time and try increasing concurrency.
      else if (this.concurrency === 1) {
        this.concurrency++;
        this._targetWindowDuration = duration;
        this._lastGoodConcurrency = this.concurrency;
      }
      // if we suddenly slowed down a lot, we should reset ourselves
      else if (duration > this._smallestTargetWindowDuration * (1 + this._windowFlexibility*4)) {
        this.concurrency = 1;
      }
      // if we have slowed up by some measurable amount, we're gonna need to reduce our concurrency
      else if (duration > this._targetWindowDuration * (1 + this._windowFlexibility*2)) {
        // if we are slower and we are already at a concurrency of 1,
        // we should adjust our fastest window expectations to be a bit slower
        if (this.concurrency === 1) {
          this.blendWindow(duration, this._windowFlexibility / 3);
        }
        else if (Math.random() < this._windowFlexibility * this._windowFlexibility) {
          this.concurrency--;
        }
      }
      // we haven't yet hit our peak, so increase concurrency
      else {
        this.concurrency++;
      }

      this._window = [];
    }
  }

  // pulled out for mocking
  time() { return new Date().getTime(); }
}

module.exports = ConcurrencyMaximizer;