//
// Usage: 
//   queue = require('./queue');
//   queue.push(function(){ func1(queue.next) });
//   queue.push(function(){ func2(queue.next) });
//
// When the queue is empty, .push() will execute the given function immediately
//

var stack = []; // private, contains the functions to be executed

//
// .push() 
//
exports.push = function(f){
  // First call executes function; subsequent calls happen through user-called .next()
  if (stack.length===0) {
    f();
  }
  stack.push(f);
};

//
// .next()
//
exports.next = function(){
  stack.shift(); // pops first element
  if (stack.length>0) {
    stack[0].call(this);
  }
};

//
// .size()
//
exports.size = function(){
  return stack.length;
};
