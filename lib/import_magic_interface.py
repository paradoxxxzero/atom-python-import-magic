import fileinput
import os
import sys

import importmagic


index_file = '.magicindex.json'


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


index = read_index() if os.path.exists(index_file) else create_index()


if __name__ == '__main__':
    source = ''.join(fileinput.input())

    if source == 'reindex':
        remove_index()
        create_index()
        print('done')
        sys.exit(0)

    scope = importmagic.Scope.from_source(source)
    unresolved, unreferenced = scope.find_unresolved_and_unreferenced_symbols()
    source = importmagic.update_imports(
        source, index, unresolved, unreferenced)
    sys.stdout.write(''.join(source))
    sys.stdout.flush()
