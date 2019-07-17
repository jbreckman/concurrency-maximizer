const t = require('tap');
const assert = require('assert');
const Promise = require('bluebird');
const ConcurrencyMaximizer = require('./concurrency-maximizer');

function getDuration(idealConcurrent, numberConcurrent) {
  if (numberConcurrent <= idealConcurrent) {
    return 100 / idealConcurrent;
  }
  else {
    let ideal = 100 / idealConcurrent;
    let overflow = (numberConcurrent / idealConcurrent);
    return ideal * overflow * overflow;
  }
}

t.test('single maximizer reachs ideal concurrency',function(t) {

  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.25);
  let time = 0;
  let steps = 10000;
  let maximimumConcurrency = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
    averageConcurrency += maximizer.concurrency;

    let duration = getDuration(ideal, taskCount);
    time += duration;
    tasks.forEach(task => task());
  }

  t.same(maximimumConcurrency, 13);
  assert(averageConcurrency / steps > 12 && averageConcurrency / steps < 13);
  t.end();
});


t.test('maxed duration (timeout) doesnt go out of control',function(t) {

  // this caps time to 14ms,
  // and the duration of an actual task is maxes at 15ms.
  // without the limit in place, concurrency would keep getting 
  // added and it'd go out of control
  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.25, 14);
  let time = 0;
  let steps = 50000;
  let maximimumConcurrency = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
    averageConcurrency += maximizer.concurrency;

    let duration = getDuration(ideal, taskCount);
    duration = Math.min(duration, 15);

    time += duration;
    tasks.forEach(task => task());
  }

  t.same(maximimumConcurrency, 12);
  assert(averageConcurrency / steps > 8 && averageConcurrency / steps < 10);
  t.end();
});


t.test('single maximizer but hits sudden slowdown',function(t) {

  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.25);
  let time = 0;
  let steps = 10000;
  let maximimumConcurrency = 0;
  let countAverage = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    if (i > steps * 0.75) {
      countAverage++;
      maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
      averageConcurrency += maximizer.concurrency;
    }

    let duration = getDuration(ideal, i > steps / 2 ? (ideal * 0.75) + taskCount : taskCount);
    time += duration;
    tasks.forEach(task => task());
  }

  t.same(maximimumConcurrency, 5);
  assert(averageConcurrency / countAverage > 4 && averageConcurrency / countAverage < 5);
  t.end();
});

t.test('single maximizer but hits massive sudden slowdown',function(t) {

  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.25);
  let time = 0;
  let steps = 10000;
  let maximimumConcurrency = 0;
  let countAverage = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    if (i > steps * 0.75) {
      countAverage++;
      maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
      averageConcurrency += maximizer.concurrency;
    }

    let duration = getDuration(ideal, i > steps / 2 ? (ideal * 4) + taskCount : taskCount);
    time += duration;
    tasks.forEach(task => task());
  }

  t.same(maximimumConcurrency, 2);
  assert(averageConcurrency / countAverage > 1 && averageConcurrency / countAverage < 2);
  t.end();
});


t.test('single maximizer but hits massive speed up',function(t) {

  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.25);
  let time = 0;
  let steps = 10000;
  let maximimumConcurrency = 0;
  let countAverage = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    if (i > steps * 0.75) {
      countAverage++;
      maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
      averageConcurrency += maximizer.concurrency;
    }

    let duration = getDuration(ideal, i < steps / 2 ? (ideal * 4) + taskCount : taskCount);
    time += duration;
    tasks.forEach(task => task());
  }

  t.same(maximimumConcurrency, 13);
  assert(averageConcurrency / countAverage > 12 && averageConcurrency / countAverage < 13);
  t.end();
});

t.test('single maximizer but hits minor speed up',function(t) {

  let ideal = 10;
  let maximizer = new ConcurrencyMaximizer(10, 0.75);
  let time = 0;
  let steps = 10000;

  let preMaximimumConcurrency = 0;
  let preCountAverage = 0;
  let preAverageConcurrency = 0;

  let maximimumConcurrency = 0;
  let countAverage = 0;
  let averageConcurrency = 0;
  maximizer.time = () => time;

  for (let i = 0; i < steps; i++) {
    let tasks = [];
    let taskCount = maximizer.concurrency;
    for (let j = 0; j < taskCount; j++) {
      tasks.push(maximizer.startItem());
    }

    if (i > steps * 0.75) {
      countAverage++;
      maximimumConcurrency = Math.max(maximizer.concurrency, maximimumConcurrency);
      averageConcurrency += maximizer.concurrency;
    }
    else if (i < steps / 2) {
      preCountAverage++;
      preMaximimumConcurrency = Math.max(maximizer.concurrency, preMaximimumConcurrency);
      preAverageConcurrency += maximizer.concurrency;
    }

    let duration = getDuration(ideal, i < steps / 2 ? 3 + taskCount : 1 + taskCount);
    time += duration;
    tasks.forEach(task => task());
  }

  t.same(preMaximimumConcurrency, 13);
  assert(preAverageConcurrency / preCountAverage > 12 && preAverageConcurrency / preCountAverage < 13);
  t.same(maximimumConcurrency, 15);
  assert(averageConcurrency / countAverage > 14 && averageConcurrency / countAverage < 15);
  t.end();
});


t.test('test map',function(t) {

  let maximizer = new ConcurrencyMaximizer(10, 0.75);
  let steps = 1000;
  let maximimumConcurrency = 0;

  let arr = [...new Array(steps)].map((d,i) => i);
  let promise = maximizer.map(arr, inp => {
    maximimumConcurrency = Math.max(maximimumConcurrency, maximizer.concurrency);
    return Promise.delay(Math.random() * 150 + 100).then(() => inp * 2);
  });


  promise.then(results => {
    t.same(results, [...new Array(steps)].map((d,i) => i*2), 'should match');
    t.ok(maximimumConcurrency > 25, 'should have high concurrency');
  })
  .catch(e => {
    t.notOk(true, 'should not error');
  })
  .finally(() => {
    t.end();
  });
});

