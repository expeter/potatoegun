# Isolated API runtime

This provisioning-only manifest pins the Linux x64 Node binary distribution. The API itself imports only Node built-ins and shared project modules. Never publish this directory as frontend content.

Install or update exclusively through sec-helper, from this directory:

```sh
sec-helper install
sec-helper audit
```

Updates use `sec-helper add npm node-linux-x64@<exact-version>`, followed by audit and tests. Keep the package lock, proxy, release cooldown, integrity verification and disabled install scripts. Do not bypass a package rejection.

The VPS uses `/opt/minizap/runtime-24.21.0/` with this manifest/lock and a guarded host-local installation. `bin/node` is a symlink to `../node_modules/node-linux-x64/bin/node`; `/opt/minizap/runtime` selects that runtime. Audit on the target host before execution: copying node_modules did not carry sufficient installed-package verification state and was rejected. The approved deployment used sec-helper install on the VPS instead.

Runtime binaries are root-owned and not writable by the minizap service user. Shared host runtimes are left unchanged. Binary SHA-256 for the deployed 24.21.0 Linux x64 build: `7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`.

Dependency-Audit: sec-helper.
