"""
    import_magic python interface
"""

import fileinput
import json
import os
import sys
from tempfile import gettempdir

try:
    from itertools import accumulate
except ImportError:
    import operator

    def accumulate(iterable, func=operator.add):
        it = iter(iterable)
        try:
            total = next(it)
        except StopIteration:
            return
        yield total
        for element in it:
            total = func(total, element)
            yield total


try:
    import importmagic
except ImportError:
    importmagic = None

try:
    import isort
except ImportError:
    isort = None


def relativize(module, root, path):
    if not path or not path.startswith(root):
        return module
    path = os.path.relpath(path, root)
    path_parts = path.split(os.path.sep)
    mod_parts = module.split('.')
    common_parts = 0
    for mod_part, path_part in zip(mod_parts, path_parts):
        if mod_part == path_part:
            common_parts += 1
        else:
            break
    if not common_parts:
        return module
    path_parts = path_parts[common_parts:]
    mod_parts = mod_parts[common_parts:]
    module = '.' * len(path_parts) + '.'.join(mod_parts)
    return module


class Commands(object):
    def __init__(self):
        if isort is None or importmagic is None:
            self.write(
                notification='error',
                message='importmagic/isort not found',
                detail='You must install isort and importmagic for %s' %
                sys.executable
            )
            sys.exit(0)

        self.data = self.read()
        self.cmd = self.data.pop('cmd', None)
        self.cwd = self.data.pop('cwd', gettempdir())

        self.index_file = os.path.join(self.cwd, '.magicindex.json')
        self._tmp_index_file = os.path.join(self.cwd, '.magicindex.json.tmp')
        self.index = self.read_index() if os.path.exists(
            self.index_file
        ) else None

    def run(self):
        fun = getattr(self, self.cmd, None)
        if self.index is None and self.cmd in ('file_import_magic',
                                               'add_import',
                                               'list_possible_imports'):
            if os.path.exists(self._tmp_index_file):
                return
            self.create_index()
            self.index = self.read_index()

        if not fun:
            self.write(
                notification='error',
                message=self.cmd,
                detail='Unknown command %s' % self.cmd
            )
            return

        fun(**self.data)

    def read_index(self):
        with open(self.index_file) as fd:
            return importmagic.SymbolIndex.deserialize(fd)

    def create_index(self):
        index = importmagic.SymbolIndex()
        index.build_index(sys.path + [self.cwd])
        with open(self._tmp_index_file, 'w') as fd:
            index.serialize(fd)
        # Prevent multiple access
        if os.path.exists(self._tmp_index_file):
            os.rename(self._tmp_index_file, self.index_file)

    def read(self):
        return json.loads(''.join(fileinput.input()))

    def write(self, **dct):
        sys.stdout.write(json.dumps(dct))
        sys.stdout.flush()

    def reindex(self):
        self.create_index()
        self.write(
            notification='success',
            message='Reindex',
            detail='%s reindexed.' % self.index_file
        )
        sys.exit(0)

    def clean_imports(self, source):
        scope = importmagic.Scope.from_source(source)
        unresolved, unreferenced = (
            scope.find_unresolved_and_unreferenced_symbols()
        )
        imports = importmagic.Imports(self.index, source)
        imports.remove(unreferenced)
        source = ''.join(imports.update_source())

        source = isort.code(source)
        self.write(file=source, unresolved=list(unresolved))

    def add_import(self, source, new_import):
        source = isort.code(
            source, config=isort.settings.Config(add_imports=(new_import, ))
        )
        self.write(file=source)

    def list_possible_imports(self, prefix, source, path=None, relative=False):
        scores = self.index.symbol_scores(prefix)
        imports = []
        for _, module, variable in scores:
            if relative:
                module = relativize(module, self.cwd, path)
            if variable is None:
                imports.append('import %s' % module)
            else:
                imports.append('from %s import %s' % (module, variable))
        self.write(imports=imports)

    def init(self):
        if self.index is None:
            self.create_index()
            self.write(message='%s indexed.' % self.index_file)
        else:
            self.write(message='Using index %s.' % self.index_file)


if __name__ == '__main__':
    Commands().run()
