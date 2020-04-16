# How to Contribute

We'd love to accept your patches and contributions to this project. There are
just a few small guidelines you need to follow.

## Contributor License Agreement

Contributions to this project must be accompanied by a Contributor License
Agreement. You (or your employer) retain the copyright to your contribution,
this simply gives us permission to use and redistribute your contributions as
part of the project. Head over to <https://cla.developers.google.com/> to see
your current agreements on file or to sign a new one.

You generally only need to submit a CLA once, so if you've already submitted one
(even if it was for a different project), you probably don't need to do it
again.

## Filing bugs

If you've found a issue, please do file a bug for us. We ask that you include
some information (included in the new issue template) so that we can reproduce
and fix the problem.

Occasionally we'll close issues if they appear stale or are too vague - please
don't take this personally! Please feel free to re-open issues we've closed if
there's something we've missed and they still need to be addressed.

## Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

Note that we request issues to be filed for all pull requests. To start, open
an issue describing the problem you're looking to solve (or locate an existing
issue that represents the problem). Include your approach to solving the
problem as this makes it easier to have a conversation about the best general
approach.

Please include tests in your pull request.

We recommend making your pull request from a fork. See [creating a pull
request from a
fork](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)
for more information.

## Stability

It’s important that our users can depend on our product, and not to worry
about changes in model-viewer causing regressions in their use of the
component. However, it’s also important that we continue to improve
model-viewer, making changes to improve ergonomics and rendering quality.

In general, <model-viewer> follows semver. Major versions (`X.y.z`) are used for
the largest features and backwards-incompatible changes (more below on that),
minor versions (`x.Y.z`) are used for new features, and patch versions (`x.y.Z`)
are used for bug fixes.

When possible please keep your changes backwards-compatible - including
keeping both existing APIs and rendering consistent. When that’s not possible,
we’ll follow a three-step process across several [semver](semver.org) major
versions (in the `0.y.z` versions leading up to 1.0, we’ll use the minor
version - `y` - for the same purpose): 

1) Add a new optional API to enable the new behavior; in the release notes,
document the new behavior, as well that it will become the default in the
next version (in for instance the `2.0.0` release)
1) Make the new API default enabled (allow it to be explicitly disabled for
the old behavior); in the release notes, document this change, and that the
API will be removed in the next version (the `3.0.0` release)
1) Remove the API (the `4.0.0` release)

Breaking changes mostly center around anything that the developer would have
to take action on. This includes changes in APIs, or changes to the model
staging/lighting that they might want to undo in order to achieve the effect
that they currently enjoy.

Additive changes (a new API) aren’t breaking, nor are smaller changes (a fix
to the correctness of reflections, or a 1% change in padding).

