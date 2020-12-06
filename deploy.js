const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');


const options = {
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 6,
};

const git = simpleGit(options);

const directory = '.';
let distFolder = path.join(directory, "dist");
fs.readdir(directory).then((files) => {
    let deleteAllExceptDist = [];
    for (const file of files) {
        if (file != ".git" &&
            file != ".gitignore" &&
            file != ".vscode" &&
            file != "node_modules" &&
            file != "dist") {
            console.log("Delete", file);
            deleteAllExceptDist.push(fs.remove(path.join(directory, file)));
        }
    }
    return Promise.all(deleteAllExceptDist);
}).then(() => {
    console.log("Checkout gh-pages");
    return git.checkout("gh-pages");
}).then(() => {
    return fs.readdir(directory).then((files) => {
        let deleteAllExceptDist = [];
        for (const file of files) {
            if (file != ".git" &&
                file != ".gitignore" &&
                file != ".vscode" &&
                file != "node_modules" &&
                file != "CNAME" &&
                file != "dist") {
                console.log("Delete", file);
                deleteAllExceptDist.push(fs.remove(path.join(directory, file)));
            }
        }
        return Promise.all(deleteAllExceptDist);
    });
}).then(() => {
    console.log("Read dist folder contents");
    return fs.readdir(distFolder);
}).then((files) => {
    console.log("Move all files out");
    let moveUp = files.map((file) => { return fs.move(path.join(distFolder, file), path.join(directory, file), {overwrite: true}); });
    return Promise.all(moveUp);
}).then(() => {
    // delete dist
    console.log("Delete dist folder");
    return fs.remove(distFolder);
}).then(() => {
    // git add everything
    console.log("git add everything");
    return git.add(".");
}).then(() => {
    // git commit
    console.log("Commit");
    return git.commit(`Deploy at ${(new Date()).toString()}`);
}).then(() => {
    // git push
    console.log("Push");
    return git.push();
}).then(() => {
    console.log("Checkout working branch");
    // git checkout all again
    return git.checkout("AllRooms/all");
});