// ============================================================
// SECTION: Utils — AST Structural Parsing (Spec B12)
// PURPOSE: Extract function maps to help AI target specific areas in large files
// ============================================================

import { parse } from '@babel/parser';
// @ts-ignore
import _traverse from '@babel/traverse';

// Deal with babel default export quirks in TS
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default || _traverse;

export interface FunctionStruct {
  name: string;
  startLine: number;
  endLine: number;
}

/**
 * Parses JS/TS files to extract structural maps of functions
 * This allows the AI to better understand scope boundaries
 */
export function extractFunctions(code: string, language: string): FunctionStruct[] {
  if (
    !language.toLowerCase().includes('javascript') && 
    !language.toLowerCase().includes('typescript') && 
    !language.toLowerCase().includes('react')
  ) {
    return []; // AST parsing currently implemented only for JS/TS
  }

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
      ],
      errorRecovery: true,
    });

    const functions: FunctionStruct[] = [];

    // Traverse the AST to find functions and classes
    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.node.loc && path.node.id?.name) {
          functions.push({
            name: path.node.id.name,
            startLine: path.node.loc.start.line,
            endLine: path.node.loc.end.line,
          });
        }
      },
      ArrowFunctionExpression(path: any) {
        if (path.node.loc && path.parent.type === 'VariableDeclarator' && path.parent.id?.name) {
          functions.push({
            name: path.parent.id.name,
            startLine: path.node.loc.start.line,
            endLine: path.node.loc.end.line,
          });
        }
      },
      ClassMethod(path: any) {
        if (path.node.loc && path.node.key?.name) {
          functions.push({
            name: `${(path.parentPath?.parent as any)?.id?.name || 'Class'}.${path.node.key.name}`,
            startLine: path.node.loc.start.line,
            endLine: path.node.loc.end.line,
          });
        }
      },
      ImportDeclaration(path: any) {
        if (path.node.loc && path.node.source?.value) {
          functions.push({
            name: `IMPORT: ${path.node.source.value}`,
            startLine: path.node.loc.start.line,
            endLine: path.node.loc.end.line,
          });
        }
      }
    });

    // Deduplicate and return
    const unique = new Map<string, FunctionStruct>();
    functions.forEach(f => {
      unique.set(f.name + f.startLine, f);
    });

    return Array.from(unique.values()).sort((a, b) => a.startLine - b.startLine);
  } catch (err) {
    console.error('AST Parsing failed', err);
    return [];
  }
}
