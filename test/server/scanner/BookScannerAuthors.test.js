const { expect } = require('chai')
const { Sequelize } = require('sequelize')
const sinon = require('sinon')

const Database = require('../../../server/Database')
const BookScanner = require('../../../server/scanner/BookScanner')
const AudioFileScanner = require('../../../server/scanner/AudioFileScanner')
const LibraryItemScanData = require('../../../server/scanner/LibraryItemScanData')
const LibraryFile = require('../../../server/objects/files/LibraryFile')
const AudioFile = require('../../../server/objects/files/AudioFile')
const CoverManager = require('../../../server/managers/CoverManager')
const SocketAuthority = require('../../../server/SocketAuthority')

describe('BookScanner author capitalization', () => {
  let library
  let folder
  let libraryScan
  let previousSettings
  let previousGlobalSettings
  let previousSequelize
  const librarySettings = { metadataPrecedence: ['audioMetatags'] }

  function scanData() {
    return new LibraryItemScanData({
      libraryId: library.id,
      libraryFolderId: folder.id,
      mediaType: 'book',
      ino: 'book-directory',
      path: '/books/Test Book',
      relPath: 'Test Book',
      isFile: false,
      mtimeMs: 1000,
      ctimeMs: 1000,
      birthtimeMs: 1000,
      mediaMetadata: { title: 'Test Book' },
      libraryFiles: [new LibraryFile({
        ino: 'audio',
        metadata: { filename: 'book.mp3', ext: '.mp3', path: '/books/Test Book/book.mp3', relPath: 'book.mp3', size: 100, mtimeMs: 1000, ctimeMs: 1000, birthtimeMs: 1000 }
      })]
    })
  }

  async function importBook(name, tag = 'tagArtist') {
    AudioFileScanner.executeMediaFileScans.callsFake(async (type, data, files) => files.map((file) => new AudioFile({ ...file.toJSON(), duration: 60, chapters: [], metaTags: { [tag]: name } })))
    const item = await BookScanner.scanNewBookLibraryItem(scanData(), librarySettings, libraryScan)
    return Database.libraryItemModel.getExpandedById(item.id)
  }

  beforeEach(async () => {
    previousSettings = Database.serverSettings
    previousGlobalSettings = global.ServerSettings
    previousSequelize = Database.sequelize
    Database.serverSettings = { scannerFindCovers: false }
    global.ServerSettings = {}
    Database.sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
    Database.sequelize.uppercaseFirst = (str) => (str ? `${str[0].toUpperCase()}${str.slice(1)}` : '')
    await Database.buildModels()
    library = await Database.libraryModel.create({ name: 'Books', mediaType: 'book' })
    folder = await Database.libraryFolderModel.create({ libraryId: library.id, path: '/books' })
    libraryScan = { addLog: sinon.stub(), authorsNumBooksChangedIds: new Set(), authorsRemovedFromBooks: [], seriesRemovedFromBooks: [] }
    sinon.stub(AudioFileScanner, 'executeMediaFileScans')
    sinon.stub(CoverManager, 'saveEmbeddedCoverArt').resolves(null)
    sinon.stub(BookScanner, 'saveMetadataFile').resolves()
    sinon.stub(SocketAuthority, 'emitter')
  })

  afterEach(async () => {
    sinon.restore()
    await Database.sequelize.close()
    Database.sequelize = previousSequelize
    Database.serverSettings = previousSettings
    global.ServerSettings = previousGlobalSettings
  })

  for (const [name, tag] of [['ARD', 'tagArtist'], ['WDR 5', 'tagAlbumArtist']]) {
    it(`persists ${name} from ${tag} and preserves the author association on rescan`, async () => {
      const item = await importBook(name, tag)
      expect(item.media.authors.map((author) => author.name)).to.deep.equal([name])
      expect(item.authorNamesFirstLast).to.equal(name)
      expect(item.toOldJSONExpanded().media.metadata.authors[0].name).to.equal(name)
      const authorId = item.media.authors[0].id

      const data = scanData()
      await data.checkLibraryItemData(item, libraryScan)
      await BookScanner.rescanExistingBookLibraryItem(item, data, librarySettings, libraryScan)
      const reloaded = await Database.libraryItemModel.getExpandedById(item.id)
      expect(reloaded.media.authors.map((author) => ({ id: author.id, name: author.name }))).to.deep.equal([{ id: authorId, name }])
      expect(await Database.authorModel.count()).to.equal(1)
      expect(await Database.bookAuthorModel.count()).to.equal(1)
    })
  }

  it('reuses an existing manually corrected author without changing its name', async () => {
    const existingAuthor = await Database.authorModel.create({ libraryId: library.id, name: 'ARD', lastFirst: 'ARD' })
    const item = await importBook('ARD')
    expect(item.media.authors.map((author) => ({ id: author.id, name: author.name }))).to.deep.equal([{ id: existingAuthor.id, name: 'ARD' }])
    expect(await Database.authorModel.count()).to.equal(1)
  })
})
