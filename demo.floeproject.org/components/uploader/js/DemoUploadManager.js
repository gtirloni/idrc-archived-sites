/*
Copyright 2009 University of Toronto
Copyright 2009 University of California, Berkeley
Copyright 2010-2011 OCAD University
Copyright 2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {
    
    fluid.registerNamespace("fluid.uploader.demo");
    
    fluid.uploader.demo.uploadNextFile = function (that) {
        // Reset our upload stats for each new file.
        that.demoState.currentFile = that.queue.files[that.demoState.fileIdx];
        that.demoState.chunksForCurrentFile = Math.ceil(that.demoState.currentFile / that.demoState.chunkSize);
        that.demoState.bytesUploaded = 0;
        that.queue.isUploading = true;
        
        that.events.onFileStart.fire(that.demoState.currentFile);
        fluid.uploader.demo.simulateUpload(that);
    };
    
    fluid.uploader.demo.updateProgress = function (file, events, demoState, isUploading) {
        if (!isUploading) {
            return;
        }
        
        var chunk = Math.min(demoState.chunkSize, file.size);
        demoState.bytesUploaded = Math.min(demoState.bytesUploaded + chunk, file.size);
        events.onFileProgress.fire(file, demoState.bytesUploaded, file.size);
    };
    
    fluid.uploader.demo.finishAndContinueOrCleanup = function (that, file) {
        // TODO: it appears that this duplicates handlers in Uploader.js onFileComplete - 
        // which this component does not fire
        that.queue.finishFile(file);
        that.events.afterFileComplete.fire(file);
        if (that.queue.shouldUploadNextFile()) {
            fluid.uploader.demo.uploadNextFile(that);
        } else {
            that.events.afterUploadComplete.fire(that.queue.currentBatch.files);
            if (file.status !== fluid.uploader.fileStatusConstants.CANCELLED) {
                that.queue.clearCurrentBatch(); // Only clear the current batch if we're actually done the batch.
            }
        }
    };
    
    fluid.uploader.demo.finishUploading = function (that) {
        if (!that.queue.isUploading) {
            return;
        }
        
        var file = that.demoState.currentFile;
        that.events.onFileSuccess.fire(file);
        that.demoState.fileIdx++;
        fluid.uploader.demo.finishAndContinueOrCleanup(that, file);
    };
    
    fluid.uploader.demo.simulateUpload = function (that) {
        if (!that.queue.isUploading) {
            return;
        }
        
        var file = that.demoState.currentFile;
        if (that.demoState.bytesUploaded < file.size) {
            fluid.invokeAfterRandomDelay(function () {
                fluid.uploader.demo.updateProgress(file, that.events, that.demoState, that.queue.isUploading);
                fluid.uploader.demo.simulateUpload(that);
            });
        } else {
            fluid.uploader.demo.finishUploading(that);
        } 
    };

    fluid.uploader.demo.stop = function (that) {
        var file = that.demoState.currentFile;
        file.filestatus = fluid.uploader.fileStatusConstants.CANCELLED;
        that.queue.shouldStop = true;
        
        // In SWFUpload's world, pausing is a combination of an UPLOAD_STOPPED error and a complete.
        that.events.onFileError.fire(file, 
                                     fluid.uploader.errorConstants.UPLOAD_STOPPED, 
                                     "The demo upload was paused by the user.");
        fluid.uploader.demo.finishAndContinueOrCleanup(that, file);
        that.events.onUploadStop.fire();
    };

    fluid.demands("fluid.uploader.uploadNextFile", "fluid.uploader.demo.remote", {
        funcName: "fluid.uploader.demo.uploadNextFile",
        args: "{that}"
    });
    
    fluid.demands("fluid.uploader.stop", "fluid.uploader.demo.remote", {
        funcName: "fluid.uploader.demo.stop",
        args: "{that}"
    });
    
    /**
     * Invokes a function after a random delay by using setTimeout.
     * @param {Function} fn the function to invoke
     */
    fluid.invokeAfterRandomDelay = function (fn) {
        var delay = Math.floor(Math.random() * 200 + 100);
        setTimeout(fn, delay);
    };

    /**
     * The demo remote pretends to upload files to the server, firing all the appropriate events
     * but without sending anything over the network or requiring a server to be running.
     * 
     * @param {Object} configuration options
     */
    
    fluid.defaults("fluid.uploader.demo.remote", {
        gradeNames: ["fluid.uploader.remote", "autoInit"],
        members: {
            demoState: {
                fileIdx: 0,
                chunkSize: 200000
            }
        }
    });
    
    fluid.demands("fluid.uploader.remote", ["fluid.uploader.multiFileUploader", "fluid.uploader.demo"], {
        funcName: "fluid.uploader.demo.remote"
    });
    
})(jQuery, fluid_1_5);
