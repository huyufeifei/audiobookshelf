const chai = require('chai')
const expect = chai.expect
const { parse, nameToLastFirst } = require('../../../../server/utils/parsers/parseNameString')

describe('parseNameString', () => {
  describe('parse', () => {
    it('returns null if nameString is empty', () => {
      const result = parse('')
      expect(result).to.be.null
    })

    it('parses single name in First Last format', () => {
      const result = parse('John Smith')
      expect(result.names).to.deep.equal(['John Smith'])
    })

    it('parses single name in Last, First format', () => {
      const result = parse('Smith, John')
      expect(result.names).to.deep.equal(['John Smith'])
    })

    it('parses multiple names separated by &', () => {
      const result = parse('John Smith & Jane Doe')
      expect(result.names).to.deep.equal(['John Smith', 'Jane Doe'])
    })

    it('parses multiple names separated by "and"', () => {
      const result = parse('John Smith and Jane Doe')
      expect(result.names).to.deep.equal(['John Smith', 'Jane Doe'])
    })

    it('parses multiple names separated by comma and "and"', () => {
      const result = parse('John Smith, Jane Doe and John Doe')
      expect(result.names).to.deep.equal(['John Smith', 'Jane Doe', 'John Doe'])
    })

    it('parses multiple names separated by semicolon', () => {
      const result = parse('John Smith; Jane Doe')
      expect(result.names).to.deep.equal(['John Smith', 'Jane Doe'])
    })

    it('parses multiple names in Last, First format', () => {
      const result = parse('Smith, John, Doe, Jane')
      expect(result.names).to.deep.equal(['John Smith', 'Jane Doe'])
    })

    it('parses multiple names with single word name', () => {
      const result = parse('John Smith, Jones, James Doe, Ludwig von Mises')
      expect(result.names).to.deep.equal(['John Smith', 'Jones', 'James Doe', 'Ludwig von Mises'])
    })

    it('parses multiple names with single word name listed first (semicolon separator)', () => {
      const result = parse('Jones; John Smith; James Doe; Ludwig von Mises')
      expect(result.names).to.deep.equal(['Jones', 'John Smith', 'James Doe', 'Ludwig von Mises'])
    })

    it('handles names with suffixes', () => {
      const result = parse('Smith, John Jr.')
      expect(result.names).to.deep.equal(['John Jr. Smith'])
    })

    it('handles compound last names', () => {
      const result = parse('von Mises, Ludwig')
      expect(result.names).to.deep.equal(['Ludwig von Mises'])
    })

    it('handles Chinese/Japanese/Korean names', () => {
      const result = parse('张三, 李四')
      expect(result.names).to.deep.equal(['张三', '李四'])
    })

    it('removes duplicate names', () => {
      const result = parse('John Smith & John Smith')
      expect(result.names).to.deep.equal(['John Smith'])
    })

    it('filters out empty names', () => {
      const result = parse('John Smith,')
      expect(result.names).to.deep.equal(['John Smith'])
    })

    describe('preserveCase', () => {
      for (const name of ['ARD', 'WDR 5', 'JOHN SMITH', 'e. e. cummings', 'McDonald']) {
        it(`preserves the original spelling of ${name}`, () => {
          expect(parse(name, { preserveCase: true }).names).to.deep.equal([name])
        })
      }

      for (const separator of [', ', '; ', ' & ', ' and ']) {
        it(`preserves case when splitting names with ${JSON.stringify(separator)}`, () => {
          expect(parse(`JOHN SMITH${separator}JANE DOE`, { preserveCase: true }).names).to.deep.equal(['JOHN SMITH', 'JANE DOE'])
        })
      }

      it('continues to reorder Last, First names and remove duplicates', () => {
        expect(parse('SMITH, JOHN, DOE, JANE, SMITH, JOHN', { preserveCase: true }).names).to.deep.equal(['JOHN SMITH', 'JANE DOE'])
      })

      it('keeps automatic case correction for callers that do not opt in', () => {
        expect(parse('JOHN SMITH').names).to.deep.equal(['John Smith'])
      })
    })
  })

  describe('nameToLastFirst', () => {
    it('keeps the existing case correction for author sorting', () => {
      expect(nameToLastFirst('JOHN SMITH')).to.equal('Smith, John')
    })

    it('converts First Last to Last, First format', () => {
      const result = nameToLastFirst('John Smith')
      expect(result).to.equal('Smith, John')
    })

    it('returns last name only when no first name', () => {
      const result = nameToLastFirst('Smith')
      expect(result).to.equal('Smith')
    })

    it('handles names with middle names', () => {
      const result = nameToLastFirst('John Middle Smith')
      expect(result).to.equal('Smith, John Middle')
    })
  })
})
