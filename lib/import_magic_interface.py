import fileinput
import json
import os
import sys
from itertools import accumulate, chain

import importmagic
import isort

index_file = os.path.abspath('.magicindex.json')


def read_index():
    with open(index_file) as fd:
        return importmagic.SymbolIndex.deserialize(fd)


def create_index():
    index = importmagic.SymbolIndex()
    index.build_index(sys.path)
    with open(index_file, 'w') as fd:
        index.serialize(fd)


def remove_index():
    os.remove(index_file)


def read():
    return json.loads(''.join(fileinput.input()))


def write(**dct):
    sys.stdout.write(json.dumps(dct))
    sys.stdout.flush()


index = read_index() if os.path.exists(index_file) else None


class Commands(object):
    def reindex(self):
        remove_index()
        create_index()
        write(message='%s reindexed.' % index_file)
        sys.exit(0)

    def file_import_magic(self, source):
        scope = importmagic.Scope.from_source(source)
        unresolved, unreferenced = (
            scope.find_unresolved_and_unreferenced_symbols())
        source = ''.join(importmagic.update_imports(
            source, index, unresolved, unreferenced))
        source = isort.SortImports(file_contents=source).output
        write(file=source)

    def add_import(self, source, new_import):
        source = '\n'.join((new_import, source))
        source = isort.SortImports(file_contents=source).output
        write(file=source)

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
                write(imports=[])
                return

        scores = index.symbol_scores(prefix)
        imports = []
        for _, module, variable in scores:
            if variable is None:
                imports.append('import %s' % module)
            else:
                imports.append(
                    'from %s import %s' % (
                        module, variable))
        write(imports=imports)

    def init(self):
        if index is None:
            create_index()
            write(message='%s indexed.' % index_file)
        else:
            write(message='Using index %s.' % index_file)

if __name__ == '__main__':
    data = read()
    command = Commands()
    cmd = data.pop('cmd', None)
    fun = getattr(command, cmd, None)

    if index is None and cmd in ('file', 'imports'):
        write(message='Index is void.')
        sys.exit(1)

    if not fun:
        write(message='Unknown command %s' % cmd)
        sys.exit(2)

    fun(**data)
