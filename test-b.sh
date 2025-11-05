#!/bin/bash

while true; do

echo
echo "我是脚本B"
echo "假装这是一个菜单"
echo -e "------------------------"
echo -e "01.   调用脚本A ▶"
echo -e "03.   调用脚本C ▶"
echo -e "------------------------"
read -p "请输入你的选择: " choice

case $choice in
  1)
    bash <(curl -Ls https://github.com/crazypeace/gh-proxy/raw/master/test-a.sh)
    ;;

  3)
    bash <(wget -qO- -o- https://github.com/crazypeace/gh-proxy/raw/master/test-c.sh)
    ;;
    
  *)
    echo "无效的输入!"
    ;;
    
esac

done
