'use strict';

const childProcess = require('child_process');
const erector = require('erector-set');
const path = require('path');
const process = require('process');
const sinon = require('sinon');
const tap = require('tap');

const initial = require('../commands/initial');
const logger = require('../commands/logging');
const utilities = require('../tools/utilities');

const caseConvert = utilities.caseConvert;
const inputs = utilities.inputs;

let mockErector;
let mockLog;
let mockLogger;

tap.test('initial', (suite) => {
    suite.beforeEach((done) => {
        mockErector = {
            construct: sinon.stub(erector, 'construct'),
            inquire: sinon.stub(erector, 'inquire')
        };

        mockLog = sinon.spy();
        mockLogger = sinon.stub(logger, 'create');
        done();
    });

    suite.afterEach((done) => {
        mockErector.construct.restore();
        mockErector.inquire.restore();

        mockLogger.restore();

        done();
    });

    suite.test('should call erector.inquire with the questions to ask', (test) => {
        const createYesNo = sinon.stub(inputs, 'createYesNoValue');
        
        test.plan(22);
        
        mockErector.inquire.rejects();
        mockLogger.returns({
            info: mockLog,
            error: mockLog
        });

        createYesNo.returns('"no" function');

        initial('./').then(() => {
            const questions = mockErector.inquire.lastCall.args[0];
            let transform;
            
            // Is there a more concise way to do this with sinon & TAP?
            // Maybe use something like jasmine.any(Function)?
            test.equal(questions[0].defaultAnswer, 'angular-librarian');
            test.equal(questions[0].name, 'name');
            test.equal(questions[0].question, 'Library name:');
            test.equal(typeof questions[0].transform, 'function');

            test.equal(questions[1].name, 'packageName');
            test.equal(typeof questions[1].transform, 'function');
            test.equal(questions[1].useAnswer, 'name');

            test.equal(typeof questions[2].defaultAnswer, 'function');
            test.equal(questions[2].name, 'readmeTitle');
            test.equal(questions[2].question, 'README Title:');
            
            test.equal(questions[3].name, 'repoUrl');
            test.equal(questions[3].question, 'Repository URL:');

            test.equal(questions[4].name, 'git');
            test.equal(questions[4].question, 'Reinitialize Git project (y/N)?');
            test.ok(createYesNo.calledWith('n'));
            test.equal(questions[4].transform, '"no" function');

            test.equal(questions[5].name, 'moduleName');
            test.equal(typeof questions[5].transform, 'function');
            test.equal(questions[5].useAnswer, 'packageName');

            test.equal(questions[6].name, 'version');
            test.equal(questions[6].question, 'Version:');

            test.ok(mockLog.calledWith('Error'));

            test.end();
        });
    });

    suite.test('should have a name question transform that tests for proper format', (test) => {
        test.plan(16);

        mockErector.inquire.rejects();
        mockLogger.returns({
            error: mockLog
        });

        initial('./').then(() => {
            const { transform } = mockErector.inquire.lastCall.args[0][0];

            test.equal(transform(), '');
            test.equal(transform(123), null);
            test.equal(transform('a'.repeat(215)), null);
            test.equal(transform(' a   '), null);
            test.equal(transform('A'), null);
            test.equal(transform('.a'), null);
            test.equal(transform('_a'), null);
            test.equal(transform('-a'), null);
            test.equal(transform('a.'), null);
            test.equal(transform('a_'), null);
            test.equal(transform('a-'), null);
            test.equal(transform('@scope/package/nope'), null);
            test.equal(transform('package/nope'), null);
            test.equal(transform('$houlnt-work'), null);
            test.equal(transform('@scope/package'), '@scope/package');
            test.equal(transform('package-name12'), 'package-name12');

            test.end();
        });
    });

    suite.test('should have a packageName question transform that extracts the package name without a scope', (test) => {
        test.plan(2);
        
        mockErector.inquire.rejects();
        mockLogger.returns({
            error: mockLog
        });

        initial('./').then(() => {
            
            const { transform } = mockErector.inquire.lastCall.args[0][1];

            test.equal(transform('@myscope/package-name'), 'package-name');
            test.equal(transform('my-package'), 'my-package');

            test.end();
        });
    });

    suite.test('should have a moduleName question transform that converts the packageName using caseConvert.dashToCap and adds a "Module" suffix', (test) => {
        const dashToCap = sinon.stub(caseConvert, 'dashToCap');

        test.plan(1);

        mockErector.inquire.rejects();
        mockLogger.returns({
            error: mockLog
        });

        dashToCap.returns('WOW!');

        initial('./').then(() => {
            const { transform } = mockErector.inquire.lastCall.args[0][5];

            test.equal(transform('this is calm'), 'WOW!Module');

            test.end();
        });
    });

    suite.end();
});
