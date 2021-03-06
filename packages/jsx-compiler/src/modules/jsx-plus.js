const t = require('@babel/types');
const traverse = require('../utils/traverseNodePath');

const directiveIf = 'x-if';
const directiveElseif = 'x-elseif';
const directiveElse = 'x-else';
const conditionTypes = {
  [directiveIf]: 'if',
  [directiveElseif]: 'elseif',
  [directiveElse]: 'else',
};

/**
 * Get condition type, enum of {if|elseif|else|null}
 */
function getCondition(jsxElement) {
  if (t.isJSXOpeningElement(jsxElement.openingElement)) {
    const { attributes } = jsxElement.openingElement;
    for (let i = 0, l = attributes.length; i < l; i++) {
      if (t.isJSXAttribute(attributes[i])) {
        switch (attributes[i].name.name) {
          case directiveIf:
          case directiveElseif:
          case directiveElse:
            return {
              type: conditionTypes[attributes[i].name.name],
              value: t.isJSXExpressionContainer(attributes[i].value)
                ? attributes[i].value.expression
                : attributes[i].value,
              index: i,
            };
        }
      }
    }
  }
  return null;
}

function transformDirectiveCondition(ast, adapter) {
  traverse(ast, {
    JSXElement(path) {
      const { node } = path;
      const condition = getCondition(node);
      if (condition !== null && condition.value !== null && condition.type === conditionTypes[directiveIf]) {
        const { type, value, index } = condition;
        const conditions = [];
        node.openingElement.attributes.splice(index, 1);
        conditions.push({
          type,
          value,
          jsxElement: node,
        });

        let continueSearch = false;
        let nextJSXElPath = path;
        let nextJSXElCondition;
        do {
          nextJSXElPath = nextJSXElPath.getSibling(nextJSXElPath.key + 1);
          if (nextJSXElPath.isJSXText() && nextJSXElPath.node.value.trim() === '') {
            continueSearch = true;
          } else if (nextJSXElPath.isJSXElement()
            && (nextJSXElCondition = getCondition(nextJSXElPath.node))) {
            conditions.push({
              type: nextJSXElCondition.type,
              value: nextJSXElCondition.value,
              jsxElement: nextJSXElPath.node,
            });
            nextJSXElPath.node.openingElement.attributes.splice(nextJSXElCondition.index, 1);
            continueSearch = true;
          } else {
            continueSearch = false;
          }
        } while (continueSearch);

        conditions.forEach(({ type, value, jsxElement }) => {
          const { attributes } = jsxElement.openingElement;
          const attr = type === conditionTypes[directiveElse]
            ? t.jsxAttribute(t.jsxIdentifier(adapter[type]))
            : t.jsxAttribute(
              t.jsxIdentifier(adapter[type]),
              t.jsxExpressionContainer(value)
            );
          attributes.push(attr);
        });
      }
    }
  });
}

function transformDirectiveList(ast, adapter) {
  traverse(ast, {
    JSXElement: {
      exit(path) {
        const { node } = path;
        const { attributes } = node.openingElement;
        if (node.__jsxlist && !node.__jsxlist.generated) {
          const { args, iterValue } = node.__jsxlist;
          path.traverse({
            Identifier(innerPath) {
              const { node } = innerPath;
              if (args.find(arg => arg.name === node.name)) {
                node.__xforArgs = true;
              }
            }
          });
          attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier(adapter.for),
              t.jsxExpressionContainer(iterValue)
            )
          );
          args.forEach((arg, index) => {
            attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier([adapter.forItem, adapter.forIndex][index]),
                t.stringLiteral(arg.name)
              )
            );
            // Mark skip ids.
            const skipIds = node.skipIds = node.skipIds || new Map();
            skipIds.set(arg.name, true);
          });

          node.__jsxlist.generated = true;
        }
      }
    },
    JSXAttribute(path) {
      const { node } = path;
      if (t.isJSXIdentifier(node.name, { name: 'x-for' })) {
        // Check stynax.
        if (!t.isJSXExpressionContainer(node.value)) {
          // TODO: throw err prettier.
          console.warn('ignore x-for due to stynax error.');
          return;
        }
        const { expression } = node.value;
        let params = [];
        let iterValue;

        if (t.isBinaryExpression(expression, { operator: 'in' })) {
          // x-for={(item, index) in value}
          const { left, right } = expression;
          iterValue = right;
          if (t.isSequenceExpression(left)) {
            // x-for={(item, key) in value}
            params = left.expressions;
          } else if (t.isIdentifier(left)) {
            // x-for={item in value}
            params.push(left);
          } else {
            // x-for={??? in value}
            throw new Error('Stynax error of x-for.');
          }
        } else {
          // x-for={value}, x-for={callExp()}, ...
          iterValue = expression;
        }
        const parentJSXEl = path.findParent(p => p.isJSXElement());
        parentJSXEl.node.__jsxlist = { args: params, iterValue, jsxplus: true };
        path.remove();
      }
    }
  });
}

function transformComponentFragment(ast) {
  function transformFragment(path) {
    if (t.isJSXIdentifier(path.node.name, { name: 'Fragment' })) {
      path.get('name').replaceWith(t.jsxIdentifier('block'));
    }
  }

  traverse(ast, {
    JSXOpeningElement: transformFragment,
    JSXClosingElement: transformFragment,
  });
  return null;
}
module.exports = {
  parse(parsed, code, options) {
    if (parsed.renderFunctionPath) {
      transformDirectiveCondition(parsed.templateAST, options.adapter);
      transformDirectiveList(parsed.templateAST, options.adapter);
    }
  },
  _transformList: transformDirectiveList,
  _transformCondition: transformDirectiveCondition,
  _transformFragment: transformComponentFragment,
};
