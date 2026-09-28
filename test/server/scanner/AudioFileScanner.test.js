const { expect } = require('chai')
const AudioFileScanner = require('../../../server/scanner/AudioFileScanner')
const AudioMetaTags = require('../../../server/objects/metadata/AudioMetaTags')

describe('AudioFileScanner author metadata', () => {
  function scan(metaTags, metadata = { authors: [] }) {
    const files = [{ metaTags: new AudioMetaTags(metaTags), chapters: [], duration: 60 }]
    AudioFileScanner.setBookMetadataFromAudioMetaTags('Test Book', files, metadata, { addLog() {} })
    return metadata
  }

  for (const tag of ['tagArtist', 'tagAlbumArtist']) {
    for (const name of ['ARD', 'WDR 5']) {
      it(`preserves ${name} from ${tag}`, () => {
        expect(scan({ [tag]: name }).authors).to.deep.equal([name])
      })
    }
  }

  it('keeps ARTIST precedence over ALBUMARTIST and trims surrounding whitespace', () => {
    expect(scan({ tagArtist: '  ARD  ', tagAlbumArtist: 'WDR 5' }).authors).to.deep.equal(['ARD'])
  })

  it('preserves multiple authors and deduplicates repeated names', () => {
    expect(scan({ tagArtist: 'ARD; WDR 5; ARD' }).authors).to.deep.equal(['ARD', 'WDR 5'])
  })

  it('preserves intentional lowercase author metadata', () => {
    expect(scan({ tagArtist: 'e. e. cummings' }).authors).to.deep.equal(['e. e. cummings'])
  })

  it('keeps existing authors when author metadata is absent', () => {
    expect(scan({}, { authors: ['Existing Author'] }).authors).to.deep.equal(['Existing Author'])
  })

  it('keeps the existing narrator normalization', () => {
    const result = scan({ tagArtist: 'ARD', tagComposer: 'JOHN SMITH' })
    expect(result.authors).to.deep.equal(['ARD'])
    expect(result.narrators).to.deep.equal(['John Smith'])
  })
})
