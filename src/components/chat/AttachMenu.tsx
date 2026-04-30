// @ts-nocheck
import React from 'react';

// Each item wraps a hidden <input type="file"> in a <label>.
// The user's click on the label directly activates the input —
// no programmatic .click() needed, so browsers never block it.
export default function AttachMenu({onImage, onFile, onClose, anchorRect}) {
  // Use position:fixed so the menu escapes the chat scroll container stacking context.
  // anchorRect is the getBoundingClientRect() of the trigger button.
  const bottom = anchorRect ? window.innerHeight - anchorRect.top + 6 : 120;
  const left   = anchorRect ? anchorRect.left : 60;

  const items = [
    { icon: '🖼', label: 'Image / Photo',  accept: 'image/*',                                              cb: onImage },
    { icon: '📄', label: 'Document',       accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar',        cb: onFile  },
    { icon: '🎬', label: 'Video',          accept: 'video/*',                                              cb: onFile  },
    { icon: '🎵', label: 'Audio File',     accept: 'audio/*',                                              cb: onFile  },
  ];

  return (
    <div style={{position:'fixed',bottom,left,
      background:'var(--panel)',border:'1px solid var(--border)',
      borderRadius:12,padding:8,display:'flex',flexDirection:'column',gap:4,
      zIndex:9999,boxShadow:'0 8px 32px rgba(0,0,0,.4)',minWidth:180,
      animation:'fadeIn .15s ease'}}>
      <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)',
        letterSpacing:'1px',padding:'4px 8px 6px'}}>ATTACH</div>
      {items.map(({icon, label, accept, cb}) => {
        const id = `attach-${label.replace(/\s/g,'-').toLowerCase()}`;
        return (
          <label key={label} htmlFor={id}
            style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
              background:'transparent',borderRadius:8,
              color:'var(--text)',fontSize:14,cursor:'pointer',
              transition:'background .12s',width:'100%'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{fontSize:18,width:24,textAlign:'center'}}>{icon}</span>
            <span>{label}</span>
            <input
              id={id}
              type="file"
              accept={accept}
              style={{display:'none'}}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                cb(file);         // pass the File directly
                e.target.value = ''; // reset so same file can be re-picked
                onClose();
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
