fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### build_all

```sh
[bundle exec] fastlane build_all
```

Build both iOS and Android apps for development

### release_all

```sh
[bundle exec] fastlane release_all
```

Build both iOS and Android apps for release

### clean

```sh
[bundle exec] fastlane clean
```

Clean all build artifacts

----


## iOS

### ios build

```sh
[bundle exec] fastlane ios build
```

Build iOS app for development

### ios release

```sh
[bundle exec] fastlane ios release
```

Build iOS app for App Store

----


## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build Android APK for development

### android release

```sh
[bundle exec] fastlane android release
```

Build Android AAB for release

### android release_apk

```sh
[bundle exec] fastlane android release_apk
```

Build Android APK for release

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
