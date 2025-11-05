#!/bin/bash

while true; do

echo
echo "我是脚本C"
echo "假装这是一个菜单"
echo -e "------------------------"
echo -e "01.   调用脚本A ▶"
echo -e "02.   调用脚本B ▶"
echo -e "------------------------"
read -p "请输入你的选择: " choice

case $choice in
  1)
    bash <(curl -Ls https://github.com/crazypeace/gh-proxy/raw/master/test-a.sh)
    ;;

  2)
    bash <(wget -qO- -o- https://github.com/crazypeace/gh-proxy/raw/master/test-b.sh)
    ;;

  *)
    echo "无效的输入!"
    ;;
    
esac

done
