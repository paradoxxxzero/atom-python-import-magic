import fileinput
import sys
import os

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


index = read_index() if os.path.exists(index_file) else None


if __name__ == '__main__':
    in_ = ''.join(fileinput.input())
    out = ''
    cmd = in_[0]
    source = in_[1:]

    if index is None and cmd in 'FI':
        print('Index is void.')
        sys.stdout.flush()
        sys.exit(11)

    if cmd == 'R':
        remove_index()
        create_index()
        sys.exit(0)

    elif cmd == 'F':
        scope = importmagic.Scope.from_source(source)
        unresolved, unreferenced = (
            scope.find_unresolved_and_unreferenced_symbols())
        out = ''.join(importmagic.update_imports(
            source, index, unresolved, unreferenced))

    elif cmd == 'I':
        scores = index.symbol_scores(source)
        imports = []
        for _, module, variable in scores:
            if variable is None:
                imports.append('import %s' % module)
            else:
                imports.append(
                    'from %s import %s' % (
                        module, variable))
        out = '\n'.join(imports)

    elif cmd == 'O':
        if index is None:
            create_index()
    else:
        print('Unknown command %s' % cmd)
        sys.stdout.flush()
        sys.exit(12)

    if out:
        sys.stdout.write(out)
    sys.stdout.flush()
