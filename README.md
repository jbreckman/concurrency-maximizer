# concurrency-maximizer

A simple utility to manage and maximize concurrency across independent nodes without overloading external resources.

### Sample use case

Image you have a system that will process a list of a million tasks you would like to complete as fast as possible.  Imagine that each task will take some amount of CPU and hit one or more external services, such as a database, ElasticSearch or other APIs.

Now imagine that there might be several other independent nodes running similar (but not identical) tasks.

What concurrency do you run these tasks to maximize efficiency and not overload your resources?

Normally you would put a rough limit on your nodes and a rough limit on the concurrency of your tasks and keep an eye on things.  

This library attempts to solve this by starting slowly and monitoring the speed of the tasks as it increases concurrency.  If it notices a sudden increase or decrease in speed, it'll scale up or down concurrency as is appropriate.  So if an external resource suddenly slows up, it'll reduce concurrency to give that resource a chance to recover.


### A very simple use case:

```
const ConcurrencyMaximizer = require('concurrency-maximizer');

let maximizer = new ConcurrencyMaximizer(5, 0.25);

let doTask = task => {
  let finishToken = maximizer.startItem();
  // do work (possibly async)
  finishToken();
};

Promise.map(someBigList, doTask, { concurrency: () => maximizer.concurrency });
```

### Instructions

The maximizer has 2 inputs:
* `window size`: The number of samples to take before making adjustments.  Defaults to 4.
* `flexibility`: A multiplier that dictates how far you want to allow the system to deviate from the fastest window size that it has seen.  Defaults to 0.25.

To start processing one task, simply call `startItem` and get back a function that you execute when the task is done executing.  

Whatever is controlling concurrency of tasks should check for the latest `concurrency` property on the maximizer.  Right now `Promise.map` does not allow for concurrency to be modified as execution changes.

