const WINDOW_SIZE = 4;
const WINDOW_DURATION_BOUNDARY = 0.25;

class ConcurrencyMaximizer {
  
  constructor(windowSize, windowFlexibility, maximumDuration, baseline) {
    this.baseline = baseline || 1;
    this.concurrency = this.baseline;
    this._ignoreNext = 0;
    this._window = [];
    this._targetWindowDuration = 0;
    this._smallestTargetWindowDuration = Number.MAX_SAFE_INTEGER;
    this._maximumDuration = maximumDuration || Number.MAX_SAFE_INTEGER;
    this._windowSize = this.baseline;
    this._maximumWindowSize = windowSize || WINDOW_SIZE;
    this._windowFlexibility = windowFlexibility || WINDOW_DURATION_BOUNDARY;
  }

  startItem() {
    let startTime = this.time();
    return () => this.processWindow(this.time() - startTime);
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
      this._ignoreNext = this.concurrency + this.baseline;

      // find the mean and standard deviation.  Take the lower end of the standard deviation
      // as a way to find a "floor".  If we are hitting some remote resource limit, this
      // floor is likely going to be the number that actually is moving.  This should handle
      // wildly fluctuating response times a bit better.
      let mean = this._window.reduce((agg, d) => agg + d, 0) / this._windowSize;
      let standardDeviation = Math.sqrt(this._window.reduce((agg, d) => agg+((d - mean)*(d - mean)), 0) / this._windowSize);
      let duration = mean - standardDeviation;

      // if our standard deviation is "large", increase the window size
      // (starting with a small window allows for faster ramp up)
      if (standardDeviation > mean * 0.2) {
        this._windowSize = Math.min(this._windowSize + 1, this._maximumWindowSize);
      }

      if (duration < 1) {
        duration = mean;
      }

      this._smallestTargetWindowDuration = Math.min(duration, this._smallestTargetWindowDuration);
      
      // if we have a new fastest window, reset it and bump our concurrency
      if (duration > this._maximumDuration) {
        if (this.concurrency > this.baseline) {
          this.concurrency = Math.max(this.concurrency / 2, this.baseline);
        }
      }
      else if (duration < this._targetWindowDuration || !this._targetWindowDuration) {
        if (!this._targetWindowDuration) {
          this.concurrency += this.baseline;
        }
        // things have sped up but are doing multiple things at once... 
        // that means other workers probably eased off - so back off to get a better
        // read of the situation
        else if (this.concurrency > this.baseline && duration < this._targetWindowDuration * (1 - this._windowFlexibility/2)) {
          this.concurrency = Math.max(Math.floor(this.concurrency / 2), this.baseline);
        }
        else if (this.concurrency > this.baseline) {
          this.concurrency += this.baseline;
        }
        this._targetWindowDuration = duration;
        this._lastGoodConcurrency = this.concurrency;
      }
      // if we are at concurrency of "1" and are slower than our "fastest" time,
      // set the target time and try increasing concurrency.
      else if (this.concurrency <= this.baseline) {
        this.concurrency+=this.baseline;
        this._targetWindowDuration = duration;
        this._lastGoodConcurrency = this.concurrency;
      }
      // if we suddenly slowed down a lot, we should reset ourselves
      else if (duration > this._smallestTargetWindowDuration * (1 + this._windowFlexibility*4)) {
        this.concurrency = this.baseline;
      }
      // if we have slowed up by some measurable amount, we're gonna need to reduce our concurrency
      else if (duration > this._targetWindowDuration * (1 + this._windowFlexibility*2)) {
        if (Math.random() < this._windowFlexibility * this._windowFlexibility) {
          this.concurrency-=this.baseline;
        }
      }
      // we haven't yet hit our peak, so increase concurrency
      else {
        this.concurrency+=this.baseline;
      }

      this._window = [];
    }
  }

  // pulled out for mocking
  time() { return new Date().getTime(); }

  map(array, fn) {
    let nextIndex = 0, currentActive = 0, results = [], outerResolve = null, outerReject = null;
    let finalPromise = new Promise((resolve,reject) => {
      outerResolve = resolve;
      outerReject = reject;
    });
    let fill = () => {
      while (currentActive < this.concurrency && nextIndex < array.length) {
        currentActive++;
        let token = this.startItem();
        let fnResult = fn(array[nextIndex]);
        results[nextIndex] = fnResult;
        fnResult
          .catch(e => {
            nextIndex = array.length;
            outerReject(e);
          })
          .finally(() => {
            token();
            currentActive--;
            fill();
          });
        nextIndex++;
        if (nextIndex === array.length) {
          outerResolve(Promise.all(results));
        }
      }
    };
    fill();
    return finalPromise;
  }
}

module.exports = ConcurrencyMaximizer;