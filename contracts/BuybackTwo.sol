pragma solidity 0.8.19;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
}

contract BuybackTwo is ERC20, Ownable {
    IUniswapV2Router02 public uniswapV2Router;
    bool public isMarketActive = true;
    address public uniswapV2Pair;
    
    uint public buyFee = 5;
    uint public sellFee = 10;

    uint256 public tSupply;

    uint256 public minimumTokenBefSwap = 10_000_000 * 10 ** decimals();
    uint256 public tokToSwap = 10_000_000 * 10 ** decimals();

    mapping(address => bool) public excludedFromFees;
    mapping(address => bool) public premarketUsers;
    mapping(address => bool) public automatedMarketMakers;


    constructor(address _router) ERC20("BuybackV2", "BB2") {
        tSupply = 10_000_000_000 * 10 ** decimals();
        uniswapV2Router = IUniswapV2Router02(_router);
        uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(address(this), uniswapV2Router.WETH());

        excludedFromFees[address(this)] = true;
        excludedFromFees[owner()] = true;

        premarketUsers[owner()] = true;

        automatedMarketMakers[uniswapV2Pair] = true;
        super._mint(msg.sender, tSupply);
    } 

    receive() external payable{}

    function _transfer(address from, address to, uint256 amount) internal override {
        console.log("entro nel transfer");
        if(!isMarketActive){
            require(premarketUsers[from], "Trades currently disabled");
        }

        bool isBuy = false;
        bool isPayingFee = true;
        bool shouldSwap = balanceOf(address(this)) > minimumTokenBefSwap;

        if(automatedMarketMakers[from]){ //buy
            isBuy = true;
            if(excludedFromFees[to]){
                isPayingFee = false;
            }
        } else if(automatedMarketMakers[to]){//sell
            if(excludedFromFees[from]){
                isPayingFee = false;
            }
        }

        if(isPayingFee){
            if(isBuy){
                uint256 feeAmount = (amount * buyFee) / 100;
                amount -= feeAmount;
                super._transfer(from, address(this), feeAmount);
            } else {
                uint256 feeAmount = (amount * sellFee) / 100;
                amount -= feeAmount;
                super._transfer(from, address(this), feeAmount);
                if(shouldSwap){
                    swapAndLiquify();
                }
            }
        }
        super._transfer(from, to, amount);
    }

    function swapAndLiquify() internal {
        console.log('SAL');
        uint256 bal = balanceOf(address(this));
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        _approve(address(this), address(uniswapV2Router), bal);
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(bal, 0, path, address(this), block.timestamp);
        buyBack();
    }

    function buyBack() internal {
        console.log("BB");
        uint256 cBalance = address(this).balance;
        console.log('contract balance: %s', cBalance);
        address[] memory path = new address[](2);
        path[0] = uniswapV2Router.WETH();
        path[1] = address(this);

        uint256[] memory amounts = uniswapV2Router.swapExactETHForTokens{value: cBalance}(0, path, 0x000000000000000000000000000000000000dEaD, block.timestamp);
        console.log(amounts.length);
        console.log('amount[0]: %s, amounts[1]: %s', amounts[0], amounts[1]);
    }
}