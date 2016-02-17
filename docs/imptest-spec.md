<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [.imptest File Specification](#imptest-file-specification)
  - [Environment Variables](#environment-variables)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## .imptest File Specification

__.imptest__ file is used to configure tests execution.

```js
{
    "apiKey":         {string},           // Build API key
    "modelId":        {string},           // Model id
    "devices":        {string[]},         // Device IDs
    "deviceFile":     {string},           // Device code file. Default: "device.nut"
    "agentFile":      {string},           // Agent code file. Default: "agent.nut"
    "tests":          {string|string[]},  // Test file search pattern. Default: ["*.test.nut", "tests/**/*.test.nut"]
    "stopOnFailure":  {boolean},          // Stop tests execution on failure? Default: false
    "timeout":        {number}            // Async test methods timeout, seconds. Default: 10
}
```

### Environment Variables

Environment variables used in place of missing keys:
- **apiKey** – `IMP_BUILD_API_KEY`
