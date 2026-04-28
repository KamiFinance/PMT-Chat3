// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function QRInline({address}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current||!address)return;
    ref.current.innerHTML='';
    const gen=()=>{
      if(!window.QRCode)return;
      new window.QRCode(ref.current,{
        text:address,width:180,height:180,
        colorDark:'#000000',colorLight:'#ffffff',
        correctLevel:window.QRCode.CorrectLevel.M,
      });
    };
    if(window.QRCode) gen();
    else{const t=setInterval(()=>{if(window.QRCode){clearInterval(t);gen();}},100);return()=>clearInterval(t);}
  },[address]);
  return <div ref={ref}/>;
}