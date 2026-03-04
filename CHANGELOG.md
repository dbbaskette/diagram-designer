# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Fixed
- Closed GitHub issue `#3`: removed `/api/debug/vcap-services` from `MetricsProxyController` so raw `VCAP_SERVICES` is never exposed by API responses.
- Closed GitHub issue `#4`: fixed `AuthenticationResolver` caching by keying with `host + normalized nodeName` to prevent cross-node credential reuse on shared hosts.
- Added backend regression tests for both fixes in:
  - `diagram-designer-api/src/test/java/com/example/diagramdesigner/controller/MetricsProxyControllerSecurityTest.java`
  - `diagram-designer-api/src/test/java/com/example/diagramdesigner/service/AuthenticationResolverTest.java`
