const Promise = TrelloPowerUp.Promise;

TrelloPowerUp.initialize({
  'board-buttons': function(t) {
    return [{
      icon: { dark:'https://img.icons8.com/ios-filled/50/backup.png', light:'https://img.icons8.com/ios-filled/50/backup.png' },
      text: 'Backups',
      callback: function(t) {
        return t.modal({ url:'./panel.html', fullscreen:false, height:680, title:'TTA Backups' });
      }
    }];
  },
  'authorization-status': function() { return { authorized:true }; }
}, { appName: 'TTA Backups' });
