const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
      },
    });

    return { code: result.outputText };
  },
};
