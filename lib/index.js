"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bookDetails_1 = __importDefault(require("./data/bookDetails"));
const generousBookNames_1 = __importDefault(require("./data/generousBookNames"));
class ReferenceParser {
    constructor({ defaults = { book: null, chapter: null, verse: null } } = {}) {
        this._matchBook = (urlBook) => {
            // first see if we can map directly
            const possibleKey = urlBook.replace(/[-_\ ]/g, "").toLowerCase();
            const generousNameList = Object.keys(generousBookNames_1.default);
            if (generousNameList.indexOf(possibleKey) > -1) {
                return generousBookNames_1.default[possibleKey];
            }
            // now try use regex to guess (return on first match)
            const bookNames = bookDetails_1.default.map(b => b.name);
            // let's try a regex on the starting characters of book names
            const r1 = new RegExp(`^${possibleKey}.*`, "i");
            const possibleMatch = bookNames.reduce((a, v) => {
                if (a)
                    return a;
                return r1.test(v) ? v : a;
            }, false);
            if (possibleMatch)
                return possibleMatch;
            // and if that didn't work, let's try on the generous booknames...
            const possibleMatch2 = Object.keys(generousBookNames_1.default).reduce((a, v) => {
                if (a)
                    return a;
                return r1.test(v) ? generousBookNames_1.default[v] : a;
            }, false);
            if (possibleMatch2)
                return possibleMatch2;
            // this is a pretty promiscuous guess but it works on stuff like "1kgs"
            const urlArray = possibleKey.split("");
            const r2 = new RegExp("^" + urlArray.join(".*"), "i");
            const possibleMatch3 = bookNames.reduce((a, v) => {
                if (a)
                    return a;
                return r2.test(v) ? v : a;
            }, false);
            if (possibleMatch3)
                return possibleMatch3;
            // Okay, we're really having a hard time with this one,
            // we'll have a last ditch try with generous book names
            return Object.keys(generousBookNames_1.default).reduce((a, v) => {
                if (a)
                    return a;
                return r2.test(v) ? generousBookNames_1.default[v] : a;
            }, false);
        };
        let { book, chapter, verse } = defaults;
        this.defaults = { book, chapter, verse };
    }
    parse(referenceString) {
        const matches = referenceString.match(/((?:(?:\d)[^a-zA-Z\d\s:]*)?[a-zA-Z-_\s]+)([^a-zA-Z\d:]*(\d+)(\D*(\d+[a-g]?))?)?/);
        return matches ? {
            book: this._matchBook(matches[1]) || this.defaults.book,
            chapter: matches[3] ? matches[3] : this.defaults.chapter,
            verse: matches[5] ? matches[5] : this.defaults.verse
        } : false;
    }
    parseComplexReference(referenceString) {
        const references = referenceString.split(/\s*[;,]\s*/);
        if (!references)
            return false;
        const [beginning, ...others] = references;
        const firstPart = this.parseRange(beginning);
        if (!firstPart)
            return false;
        const output = {
            book: firstPart.book,
            ranges: [],
        };
        let currentChapter = firstPart.endChapter;
        output.ranges = [
            firstPart,
            ...others.reduce((accumulator, ref) => {
                let newRef;
                if (ref.match(/^\d+[:.]\d/)) { // chapter ref provided
                    newRef = this.parseRange(firstPart.book + ' ' + ref);
                }
                else { // no chapter ref provided
                    newRef = this.parseRange(firstPart.book + ' ' + currentChapter + ':' + ref);
                }
                if (newRef) {
                    accumulator.push(newRef);
                    currentChapter = newRef.endChapter || newRef.startChapter;
                }
                return accumulator;
            }, []),
        ];
        return output;
    }
    parseRange(referenceString) {
        const matches = referenceString.split(/[-–—]/, 2);
        if (!matches.length)
            return false;
        const beginning = this.parse(referenceString);
        if (beginning === false)
            return false;
        if (matches.length === 1) {
            return {
                book: beginning.book,
                startChapter: beginning.chapter,
                endChapter: null,
                startVerse: beginning.verse,
                endVerse: null
            };
        }
        else {
            let end;
            if (matches[1].match(/^\d+[:.]\d/)) { // a chapter reference is provided
                end = this.parse(beginning.book + ' ' + matches[1]);
            }
            else { // the same chapter is used
                end = this.parse(beginning.book + ' ' + beginning.chapter + ':' + matches[1]);
            }
            if (end === false) {
                end = {
                    book: null,
                    chapter: null,
                    verse: null,
                };
            }
            return {
                book: beginning.book,
                startChapter: beginning.chapter,
                endChapter: end.chapter,
                startVerse: beginning.verse,
                endVerse: end.verse
            };
        }
        //const groups = referenceString.split(/\s*[;,]\s*/);
    }
}
exports.default = ReferenceParser;
