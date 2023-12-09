

const postData3 = [{
  commit_data: {"delta": {
    'Banana': 2,
    'Apple': 1,
  }},
  username:'USER1',
  listName : 'ListaDeNatal#123',
  commitHash : '1702140276787n5exqofz49'
},
{
  commit_data: {"delta": {
    'Banana': -2,
  }},
  username:'USER2',
  listName : 'ListaDeNatal#123',
  commitHash : '1702140272197dd38pntnpss'
},
{
  commit_data: {"delta": {
    'Apple': 2,
  }},
  username:'USER2',
  listName : 'ViagemABarcelona#123',
  commitHash : '1702140272197dd38pntnpss'
}

];
let i = 0;
let port = [5000, 5000, 5002];
for (const postData of postData3) {
  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({node: port[i], data: postData}),
  })
    .then(response => response.json())
    .then(data => {
      console.log('Response from server:', data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
    i++;
}





