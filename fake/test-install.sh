RESET='\e[0m'

RED='\e[31m'             # 稳定
ORANGE='\e[38;5;208m'    # 贵（256色）
PURPLE='\e[35m'          # 慢 / 吐槽
YELLOW='\e[33m'          # 速度
GREEN='\e[32m'           # 差 / 链接
BLUE='\e[34m'            # 便宜

echo -e "         ____"
echo -e "        /    \\"
echo -e "       / ${RED}稳定${RESET} \\"
echo -e "      /        \\"
echo -e "     +----------+"
echo -e "    /\\ ${ORANGE}贵${RESET} /\\ ${PURPLE}慢${RESET} /\\"
echo -e "   /  \\  /  \\  /  \\"
echo -e "  /    \\/____\\/    \\"
echo -e "  \\ ${YELLOW}速度${RESET}\\ ${GREEN}差${RESET} / ${BLUE}便宜${RESET}/"
echo -e "   \\     \\  /     /"
echo -e "    \\_____\\/_____/"
echo


echo -e "推荐使用 三色图中央 的 VPS ${PURPLE}(不是${RESET}"
echo -e "${GREEN} https://my.racknerd.com/aff.php?aff=1374&pid=924 ${RESET}"
echo

echo -e "这个才是 三色图中央 的 VPN ${PURPLE}(才怪${RESET}"
echo -e "${GREEN} https://justmysocks.net/members/aff.php?aff=256&gid=1 ${RESET}"
echo

echo -e "现在下载 sing-box 的压缩包 ${PURPLE}(吗?${RESET}"
echo -e "${GREEN} https://github.com/SagerNet/sing-box/releases/download/v1.12.15/sing-box-1.12.15-windows-amd64.zip ${RESET}"

wget -nv "https://github.com/SagerNet/sing-box/releases/download/v1.12.15/sing-box-1.12.15-windows-amd64.zip"
