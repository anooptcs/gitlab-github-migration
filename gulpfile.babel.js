import babel from 'gulp-babel';
import bump from 'gulp-bump';
import conventionalChangelog from 'gulp-conventional-changelog';
import debug from 'gulp-debug';
import del from 'del';
import fs from 'fs-extra';
import git from 'gulp-git';
import gulp from 'gulp';
import gutil from 'gulp-util';
import jsdoc from 'gulp-jsdoc3';
import minimist from 'minimist';

const config = {
  src: `./src/**/*.js`,
  dist: `./dist`
};

const defaultOptions = {
  string: `env`,
  default: {
    env: process.env.NODE_ENV || `production`,
    bump: `patch`
  }
};

let options = minimist(process.argv.slice(2), defaultOptions);

/**
 * Get uncached package version.
 * @method getPackageJsonVersion
 * @return {string} version
 */
function getPackageJsonVersion() {
  // We parse the json file instead of using require because require caches
  // multiple calls so the version number won't be updated
  return JSON.parse(fs.readFileSync(`./package.json`, `utf8`)).version;
}

gulp.task(`docs`, () => {
  let docConf = require(`./jsdoc.json`);
  return gulp.src([`README.md`, `./src/**/*.js`], {
    read: false
  })
    .pipe(jsdoc(docConf));
});

gulp.task(`babel`, () => {
  return gulp.src(config.src)
    .pipe(babel())
    .pipe(gulp.dest(config.dist));
});


gulp.task(`clean`, () => {
  return del(config.dist);
});

// =============================================================================
// create a changelog
gulp.task(`build:changelog`, () => {
  return gulp.src(`CHANGELOG.md`, {
    buffer: false
  })
    .pipe(conventionalChangelog({
      preset: `eslint`,
      releaseCount: 0
    }))
    .pipe(gulp.dest(`./`));
});

// =============================================================================
// bump package.json version
gulp.task(`build:bump-version`, () => {
  return gulp.src(`package.json`)
    .pipe(bump({
      type: options.bump
    }).on(`error`, gutil.log))
    .pipe(gulp.dest(`./`));
});

// =============================================================================
// set package.json version - unused
gulp.task(`build:set-version`, cb => {
  if (!options.version) {
    return cb(`Invalid semver ` + parsed);
  }

  let verKey = options.version_key || `version`;
  let regex  = opts.regex || new RegExp(
    '([\'|\"]?' + verKey + '[\'|\"]?[ ]*:[ ]*[\'|\"]?)(\\d+\\.\\d+\\.\\d+(-' + //eslint-disable-line quotes
    options.version_preid +
    '\\.\\d+)?(-\\d+)?)[\\d||A-a|.|-]*([\'|\"]?)', `i`); //eslint-disable-line quotes
  cb();
});

// =============================================================================
// commit all changes in current workspace.
gulp.task(`build:commit-changes`, () => {
  return gulp.src(`.`)
    .pipe(git.add())
    .pipe(git.commit(`Bumped version number: ${getPackageJsonVersion()}`));
});

// =============================================================================
// push all commits to master branch
gulp.task(`build:push-changes`, cb => {
  git.push(`origin`, `master`, cb);
});

// =============================================================================
// Create a tag for the current version where version is taken from the package.json file
gulp.task(`build:create-new-tag`, cb => {
  let version = getPackageJsonVersion();
  git.tag(version, `Created Tag for version: ` + version, function(error) {
    if (error) {
      return cb(error);
    }
    git.push(`origin`, `master`, {
      args: `--tags`
    }, cb);
  });
});

// =============================================================================
// release driver task
gulp.task(`build:release`, gulp.series(
  `build:bump-version`,
  `build:changelog`,
  `build:commit-changes`,
  `build:push-changes`,
  `build:create-new-tag`,
  cb => {
    console.log(`RELEASE FINISHED SUCCESSFULLY`);
    cb();
  })
);


gulp.task(`build`, gulp.series(`clean`, `babel`, `docs`));

gulp.task(`watch:js`, () => {
  gulp.watch(config.src, gulp.series(`babel`, `docs`));
});

gulp.task(`watch`, gulp.parallel(
  `watch:js`
));

gulp.task(`default`, gulp.series(`build`, `watch`));
