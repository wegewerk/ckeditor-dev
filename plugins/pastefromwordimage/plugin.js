/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

( function() {
	'use strict';

	CKEDITOR.plugins.add( 'pastefromwordimage', {
		requires: 'pastefromword',
		init: function( editor ) {
			if ( !CKEDITOR.plugins.clipboard.isCustomDataTypesSupported ) {
				return;
			}

			// Register a proper filter, so that images are not stripped out.
			editor.filter.allow( 'img[src]' );

			editor.on( 'afterPasteFromWord', this.pasteListener, this );
		},

		pasteListener: function( evt ) {
			var pfwi = CKEDITOR.plugins.pastefromwordimage,
				imgTags,
				hexImages,
				newSrcValues = [],
				i;

			imgTags = pfwi.extractImgTagsFromHtmlString( evt.data.dataValue );
			if ( imgTags.length === 0 ) {
				return;
			}

			hexImages = pfwi.extractImagesFromRtf( evt.data.dataTransfer[ 'text/rtf' ] );
			if ( hexImages.length === 0 ) {
				return;
			}

			CKEDITOR.tools.array.forEach( hexImages, function( img ) {
				newSrcValues.push( this.createSrcWithBase64( img ) );
			}, this );

			// Assumption there is equal amout of Images in RTF and HTML source, so we can match them accoriding to existing order.
			if ( imgTags.length === newSrcValues.length ) {
				for ( i = 0; i < imgTags.length; i++ ) {
					// Replace only `file` urls and real images ( shapes are null ).
					if ( ( imgTags[ i ][ 1 ].indexOf( 'file:///' ) === 0 ) && newSrcValues[ i ] ) {
						evt.data.dataValue = evt.data.dataValue.replace( imgTags[ i ][ 1 ], newSrcValues[ i ] );
					}
				}
			} else {
				throw new Error( 'There appeared a problem with embeding images while pasting from Word.' );
			}

		},

		createSrcWithBase64: function( img ) {
			return img.type ? 'data:' + img.type + ';base64,' + this.hexToBase64( img.hex ) : null;
		},

		hexToBase64: function( hexString ) {
			return CKEDITOR.tools.convertBytesToBase64( CKEDITOR.tools.convertHexStringToBytes( hexString ) );
		}

	} );

	/**
	 * Help methods used by paste from word image plugin.
	 *
	 * @since 4.8.0
	 * @class CKEDITOR.plugins.pastefromwordimage
	 */
	CKEDITOR.plugins.pastefromwordimage = {
		/**
		 * Methods parse RTF clipboard to find embedded images.
		 *
		 * @private
		 * @since 4.8.0
		 * @param {String} rtfClipboard Data obtained from RTF clipboard.
		 * @returns {Array} Contains array of objects with images or empty array if there weren't a match.
		 * @returns {Object} return.Object Single image found in `rtfClipboard`.
		 * @returns {String/null} return.Object.hex Hexadecimal string of image embedded in RTF clipboard.
		 * @returns {String/null} return.Object.type String represent type of image, allowed values: 'image/png', 'image/jpeg' or `null`
		 */
		extractImagesFromRtf: function( rtfClipboard ) {
			var ret = [],
				rePictureHeader = /\{\\\*\\shppict[\s\S]+?{\\\*\\blipuid\s+[0-9a-f]+\}\s?/,
				reShapeHeader = /\{\\shp[\s\S]+?\{\\\*\\svb\s?/,
				rePictureOrShape = new RegExp( '(?:(' + rePictureHeader.source + ')|(' + reShapeHeader.source + '))([0-9a-f\\s]+)\\}\\}', 'g' ),
				wholeImages,
				imageType;

			wholeImages = rtfClipboard.match( rePictureOrShape );
			if ( !wholeImages ) {
				return ret;
			}

			for ( var i = 0; i < wholeImages.length; i++ ) {
				if ( rePictureHeader.test( wholeImages[ i ] ) ) {
					if ( wholeImages[ i ].indexOf( '\\pngblip' ) !== -1 ) {
						imageType = 'image/png';
					} else if ( wholeImages[ i ].indexOf( '\\jpegblip' ) !== -1 ) {
						imageType = 'image/jpeg';
					} else {
						imageType = null;
					}

					ret.push( {
						hex: imageType ? wholeImages[ i ].replace( rePictureHeader, '' ).replace( /\s/g, '' ).replace( /\}\}/, '' ) : null,
						type: imageType
					} );
				} else if ( reShapeHeader.test( wholeImages[ i ] ) ) {
					// We left information about shapes, to have proper indexes of images.
					ret.push( {
						hex: null,
						type: null
					} );
				} else {
					throw new Error( 'Problem with processing images in RTF clipboard.' );
				}
			}

			return ret;
		},

		/**
		 * Method extracts array of img tags from given htmlString.
		 *
		 * @private
		 * @since 4.8.0
		 * @param {String} htmlString String represent HTML code.
		 * @returns {Array} Array of arrays represent img tags found in `htmlString`.
		 * @returns {Array} return.Array Single result of `regexp.exec`, which finds img tags.
		 */
		extractImgTagsFromHtmlString: function( htmlString ) {
			var regexp = /<img[^>]+src="([^"]+)/g,
				ret = [];

			do {
				ret.push( regexp.exec( htmlString ) );
			} while ( ret[ ret.length - 1 ] );

			// Remove null.
			ret.pop();

			return ret;
		}
	};
} )();
