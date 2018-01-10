const _ = require('lodash');
const aws = require('aws-sdk');
const uuid = require('node-uuid');
const util = require('util');

class Workflow {
    /**
     * Create workflow object
     * @param {string} name Workflow name
     * @param {string} version Workflow version
     * @param {string} domain Domain name
     * @param {string} taskList decider tasklist
     */
    constructor(name, version, domain, taskList) {
        this.client = new aws.SWF();
        this.domain = domain;
        this.taskList = taskList;
        this.workflowType = {name, version};
    }

    start(input) {
        return this.client.startWorkflowExecution({
            domain: this.domain,
            workflowId: uuid.v4(),
            workflowType: this.workflowType,
            taskList: {
                name: this.taskList
            },
            input: (_.isUndefined(input) || _.isString(input)) ? input : JSON.stringify(input)
        });
    }
}

module.exports = Workflow;