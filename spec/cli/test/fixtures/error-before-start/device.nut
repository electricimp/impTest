// causes out-of memory error
function oom() {
  local s = "abcdefghijklmnopqrstuvwxyz";
  while (1) s += s;
}

// cause OOM before session start
oom();
