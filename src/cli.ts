// update prefix all index -> updateIndex --prefix users --all
// update prefix specific index -> updateIndex users::usersname
// delete prefix all index -> deleteIndex --prefix users --all
// delete prefix specific index

import { prompt } from 'enquirer'
 
(async () => {
  const response = await prompt({
    type: 'input',
    name: 'username',
    message: 'What is your username?'
  });
   
  console.log(response);
})()
