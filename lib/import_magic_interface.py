"""
    import_magic python interfa
"""

import fileinput
import json
import os
import sys
from itertools import chain
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


class Commands(object):
    def __init__(self):
        if isort is None or importmagic is None:
            self.write(
                notification='error',
                message='importmagic/isort not found',
                detail='You must install isort and importmagic for %s' %
                sys.executable)
            sys.exit(0)

        self.data = self.read()
        self.cmd = self.data.pop('cmd', None)
        self.cwd = self.data.pop('cwd', gettempdir())

        self.index_file = os.path.join(self.cwd, '.magicindex.json')
        self._tmp_index_file = os.path.join(self.cwd, '.magicindex.json.tmp')
        self.index = self.read_index() if os.path.exists(
            self.index_file) else None

    def run(self):
        fun = getattr(self, self.cmd, None)
        if self.index is None and self.cmd in (
                'file_import_magic', 'add_import', 'list_possible_imports'):
            if os.path.exists(self._tmp_index_file):
                return
            self.create_index()
            self.index = self.read_index()

        if not fun:
            self.write(
                notification='error',
                message=self.cmd,
                detail='Unknown command %s' % self.cmd)
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
            detail='%s reindexed.' % self.index_file)
        sys.exit(0)

    def file_import_magic(self, source):
        scope = importmagic.Scope.from_source(source)
        unresolved, unreferenced = (
            scope.find_unresolved_and_unreferenced_symbols())
        source = ''.join(importmagic.update_imports(
            source, self.index, unresolved, unreferenced))
        source = isort.SortImports(file_contents=source).output
        self.write(file=source)

    def add_import(self, source, new_import):
        source = isort.SortImports(
            file_contents=source, add_imports=(new_import,)).output
        self.write(file=source)

    def list_possible_imports(self, prefix, source):
        try:
            scope = importmagic.Scope.from_source(source)
        except SyntaxError:
            scope = None

        if scope:
            unresolved, unreferenced = (
                scope.find_unresolved_and_unreferenced_symbols())

            if prefix not in set(chain(*[
                    accumulate(part.split('.'), lambda *t: '.'.join(t))
                    for part in unresolved])):
                self.write(imports=[])
                return

        scores = self.index.symbol_scores(prefix)
        imports = []
        for _, module, variable in scores:
            if variable is None:
                imports.append('import %s' % module)
            else:
                imports.append(
                    'from %s import %s' % (
                        module, variable))
        self.write(imports=imports)

    def init(self):
        if self.index is None:
            self.create_index()
            self.write(message='%s indexed.' % self.index_file)
        else:
            self.write(message='Using index %s.' % self.index_file)


if __name__ == '__main__':
    Commands().run()
