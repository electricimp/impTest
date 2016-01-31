i <- 0;

function w() {
  server.log(++i);
  imp.wakeup(0.01, w);
}

w();

