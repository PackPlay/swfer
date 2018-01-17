# swfer
Making swf simpler

## Template - Decider
```js

const Decider = require('swfer').Decider;
const decider = new Decider(process.env.SWF_DOMAIN, process.env.SWF_TASKLIST);

decider.on('WorkflowExecutionStarted', (decisionTask, event) => {
    // on workflow start (either by api or by script)
    console.log('Workflow Started', event);
    
    let attributes = event.getAttributes();
    let activity = {
        name: '{FIRST_TASK}',
        version: '1.0.0'
    };
    
    // start first task
    decider.scheduleActivityTask(activity, '{FIRST_TASKLIST}', attributes.input, decisionTask.taskToken);
});
decider.on('ActivityTaskFailed', (decisionTask, event) => {
    // an individual activity task has failed
    console.log('ActivityTaskFailed', event);

    // stop workflow
    let {reason, details} = event.getAttributes();
    decider.failWorkflowExecution(reason, details, decisionTask.taskToken);
});
decider.on('ActivityTaskCompleted', (decisionTask, event) => {
    // an individual activity task has completed
    console.log('ActivityTaskCompleted', event);
    let attributes = event.getAttributes();

    if(event.isActivity({ name: 'next', version: '1.0.0'})) {
        // complete the workflow
        decider.completeWorkflowExecution("done", decisionTask.taskToken);
    } else {
        let activity = {
            name: '{NEXT_TASK}',
            version: '1.0.0'
        };

        // start next task
        decider.scheduleActivityTask(activity, '{NEXT_TASKLIST}', attributes.result, decisionTask.taskToken);
    }
});

// start listener
decider.start();
```

## Template - Activity
```js
    const Activity = require('swfer');
    const activity = new Activity(process.env.SWF_DOMAIN, process.env.SWF_TASKLIST);
    
    activity.on('ActivityTask', activityTask => {
        // new activity task is assigned
        let input = JSON.parse(activityTask.input);
        /* do task */
        /* ... */
        let result = JSON.stringify({/* RESULT */});

        // complete task
        activity.complete(result, activityTask.taskToken);
        //activity.fail(name, details, activityTask.taskToken);
    });

    // start listener
    activity.start();
```