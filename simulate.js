const Maximizer = require('./concurrency-maximizer');
const Promise = require('bluebird');

function work(counter) {
  return Promise.resolve().then(() => {
    var value = Math.random() * 100000;
    for (var i = 1; i < 10000; i++) {
      value /= i;
    }
    if (counter > 0) return Promise.delay(1).then(() => work(counter - 1));
    return value;
  });
}

class Worker {
  constructor(taskSize, numberToRun) {
    this.maximizer = new Maximizer(15, 0.5, 200, 2);
    this.numberActive = 0;
    this.numberToRun = numberToRun;
    this.taskSize = taskSize;
    this.checkShouldRun();
  }

  checkShouldRun() {
    if (this.numberToRun-- <= 0) {
      if (!this.loggedMessage) {
        this.maximizer = null;
        this.loggedMessage = true;
        console.log("Finished worker");
      }
      return;
    }

    if (this.numberActive < this.maximizer.concurrency) {
      this.runOne();
      this.checkShouldRun();
    }
  }

  runOne() {
    let finishToken = this.maximizer.startItem();
    this.numberActive++;
    work(10 * this.taskSize).then(() => {
      finishToken();
      this.numberActive--;
      this.checkShouldRun();
    });
  }
}


let workers = [];
function createWorker() {
  workers.push(new Worker(Math.floor(Math.random()*3)+2, 80000 + Math.floor(Math.random() * 80000)));
  setTimeout(createWorker, 30000 + (2500 * workers.length * workers.length));
}
createWorker();

setInterval(() => {
  console.log(workers.map(worker => worker.maximizer && worker.maximizer.concurrency).join('\t'));
}, 100);