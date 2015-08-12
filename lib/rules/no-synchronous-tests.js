'use strict';

var _ = require('lodash');

module.exports = function (context) {
    var possibleAsyncFunctionNames = [
        'it',
        'it.only',
        'test',
        'test.only',
        'before',
        'after',
        'beforeEach',
        'afterEach'
    ];

    function getCalleeName(callee) {
        if (callee.type === 'MemberExpression') {
             return callee.object.name + '.' + callee.property.name;
        }

        return callee.name;
    }

    function hasParentMochaFunctionCall(functionExpression) {
        var name;

        if (functionExpression.parent && functionExpression.parent.type === 'CallExpression') {
            name = getCalleeName(functionExpression.parent.callee);
            return possibleAsyncFunctionNames.indexOf(name) > -1;
        }

        return false;
    }

    function hasAsyncCallback(functionExpression) {
        return functionExpression.params.length === 1;
    }

    function findPromiseReturnStatement(nodes) {
      return _.find(nodes, function (node) {
        return node.type === 'ReturnStatement' && node.argument && node.argument.type !== 'Literal';
      });
    }

    function checkPromiseReturn(functionExpression) {
        var bodyStatement = functionExpression.body;
        var returnStatement = null;
        if (bodyStatement.type === 'BlockStatement') {
            returnStatement = findPromiseReturnStatement(functionExpression.body.body);
        } else if (bodyStatement.type === 'CallExpression') {
            //  allow arrow statements calling a promise with implicit return.
            returnStatement = bodyStatement;
        }

        if (!returnStatement) {
            context.report(functionExpression, 'Expected test to handle a callback or return a promise.');
        }
    }

    function check(node) {
        if (hasParentMochaFunctionCall(node) && !hasAsyncCallback(node)) {
            checkPromiseReturn(node);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};