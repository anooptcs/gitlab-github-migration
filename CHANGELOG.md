<a name="0.3.0"></a>
# [0.3.0](https://github.com/mtechaccess/migrate/compare/0.2.2...v0.3.0) (2017-02-07)


### build

* use bable latest, gear up for using es2017 ([5fdf4eed1ebe5ecdfb76ff631e277b7e2ee78cac](https://github.com/mtechaccess/migrate/commit/5fdf4eed1ebe5ecdfb76ff631e277b7e2ee78cac))

### task

* (cli): minor cleanups ([2ade13a7abdec59c39e5c4e6acd52bc46e325691](https://github.com/mtechaccess/migrate/commit/2ade13a7abdec59c39e5c4e6acd52bc46e325691))

### update

* (migrate): create milestones with mapped state and ios date strings ([60ef229bda0c7d359682eff46d35285f157deb7d](https://github.com/mtechaccess/migrate/commit/60ef229bda0c7d359682eff46d35285f157deb7d))
* (migrate): eslint `prefer-const`, refactor milestones and getRepo to use async/await ([f83ebc30c2d53e6667e86db3f1e16323164cc3a7](https://github.com/mtechaccess/migrate/commit/f83ebc30c2d53e6667e86db3f1e16323164cc3a7))
* async all the things! thx QC ([19f3aa869ccc9840a49c2eb60faa386cccaac464](https://github.com/mtechaccess/migrate/commit/19f3aa869ccc9840a49c2eb60faa386cccaac464))



<a name="0.2.2"></a>
## [0.2.2](https://github.com/mtechaccess/migrate/compare/0.2.1...0.2.2) (2017-02-06)


### feat

* feat: (migrate): comments and issues (closes #3) ([380a69f485dcd5090db955977cc4624836510fb1](https://github.com/mtechaccess/migrate/commit/380a69f485dcd5090db955977cc4624836510fb1)), closes [#3](https://github.com/mtechaccess/migrate/issues/3)
* feat: (migrate): import milestones, issues and comments. (closes #2, #3) ([8c5d502ff0e868f2f01025e4a866db9ec537fb6b](https://github.com/mtechaccess/migrate/commit/8c5d502ff0e868f2f01025e4a866db9ec537fb6b)), closes [#2](https://github.com/mtechaccess/migrate/issues/2) [#3](https://github.com/mtechaccess/migrate/issues/3)
* feat: (migrate): stub code for milesones/issues/comments (refs #2,#3) ([db29622b184c741f1797709a502e635697380aa7](https://github.com/mtechaccess/migrate/commit/db29622b184c741f1797709a502e635697380aa7))

### update

* (migrate): refactor error for missing gl labels ([eb3c6d3c23676002fa5ab96a3c3cb8cd062c71cc](https://github.com/mtechaccess/migrate/commit/eb3c6d3c23676002fa5ab96a3c3cb8cd062c71cc))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/mtechaccess/migrate/compare/0.2.0...0.2.1) (2017-02-03)


### feat

* (migrate): import gitlab labels,only if they are missing from github ([75a2116ce8d83c2c907b3c6b72cb738bce6d16a7](https://github.com/mtechaccess/migrate/commit/75a2116ce8d83c2c907b3c6b72cb738bce6d16a7))
* feat: (migrate): import labels handle missing gitlab labels properly (closes #1) ([3b05f5f6891a3032f686a455f8b38fac45980949](https://github.com/mtechaccess/migrate/commit/3b05f5f6891a3032f686a455f8b38fac45980949)), closes [#1](https://github.com/mtechaccess/migrate/issues/1)

### update

* (migrate): new `remove` mode, stubbed migrate for issues/labels/milestones and comments ([9b8e8d78a4bfecc96dee69225945bdbc805a960c](https://github.com/mtechaccess/migrate/commit/9b8e8d78a4bfecc96dee69225945bdbc805a960c))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/mtechaccess/migrate/compare/522779922502e3206fa695d91ecf47e5d245d5d3...0.2.0) (2017-02-03)


### deps

* include `p-wait-for` ([f0b037612aa4c96c4409800b29d3ce81d13cce9c](https://github.com/mtechaccess/migrate/commit/f0b037612aa4c96c4409800b29d3ce81d13cce9c))

### docs

* (README): update notes on installation and configuration ([d9754a9aeb1dfa01f9c47a0d6385bc4550a8c30c](https://github.com/mtechaccess/migrate/commit/d9754a9aeb1dfa01f9c47a0d6385bc4550a8c30c))

### task

* (package): fix name of binary ([8b61596444da208b15f31dd5867e8404d44da742](https://github.com/mtechaccess/migrate/commit/8b61596444da208b15f31dd5867e8404d44da742))

### update

* (migrate): handle importAll. ([57a4ed0e62df0b51a54101df21d9fc513f09d924](https://github.com/mtechaccess/migrate/commit/57a4ed0e62df0b51a54101df21d9fc513f09d924))
* (migrate): refactor for sanity. doc blocks. ([ad6085949ae6d33d38f48d5442b8ea51dc5f504a](https://github.com/mtechaccess/migrate/commit/ad6085949ae6d33d38f48d5442b8ea51dc5f504a))
* (migrate): restructure single import ([124490a152ab0ffd0063e355ed4fc8eae184f2e3](https://github.com/mtechaccess/migrate/commit/124490a152ab0ffd0063e355ed4fc8eae184f2e3))
* project name and repo. stub code ([522779922502e3206fa695d91ecf47e5d245d5d3](https://github.com/mtechaccess/migrate/commit/522779922502e3206fa695d91ecf47e5d245d5d3))
* single repo import funcitonality. if repo exists in gitlab, and not in github, create repo, then import code fro gitlab into github ([5161c5f0bb806085d620033715a4689da47bcb54](https://github.com/mtechaccess/migrate/commit/5161c5f0bb806085d620033715a4689da47bcb54))
* use `request` to access scm. testing repos access ([c97c52df17d6ec00fad39c73c5c4e5536622acc7](https://github.com/mtechaccess/migrate/commit/c97c52df17d6ec00fad39c73c5c4e5536622acc7))



