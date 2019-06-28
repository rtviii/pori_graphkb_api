const {match: {neighborhood, descendants}, Comparison} = require('./../../../app/repo/query');

const {stripSQL} = require('./util');


describe('treeQuery', () => {
    test('custom edges', () => {
        const {query, params} = descendants({
            whereClause: new Comparison('name', 'blargh'),
            modelName: 'Disease',
            edges: ['AliasOf']
        });
        expect(stripSQL(query)).toBe(
            'TRAVERSE out(\'AliasOf\') FROM (SELECT * FROM Disease WHERE name = :param0) MAXDEPTH 50'
        );
        expect(params).toEqual({param0: 'blargh'});
    });
});


describe('neighborhood', () => {
    test('custom edges and depth', () => {
        const {query, params} = neighborhood({
            whereClause: new Comparison('name', 'blargh'),
            modelName: 'Disease',
            edges: ['AliasOf'],
            direction: 'both',
            depth: 1
        });
        expect(stripSQL(query)).toBe(
            'SELECT * FROM (MATCH {class: Disease, WHERE: (name = :param0)}.both(\'AliasOf\'){WHILE: ($depth < 1)} RETURN DISTINCT $pathElements)'
        );
        expect(params).toEqual({param0: 'blargh'});
    });
});
