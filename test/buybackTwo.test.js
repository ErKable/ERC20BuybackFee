const { expect } = require("chai");
const { ethers } = require("hardhat");
const pancake_router_abi = require("../../abi/pancake.json");


function formatUnits(value) {
    return ethers.utils.formatUnits(value.toString(), 18)
}

function parseUnits(value) {
    return ethers.utils.parseUnits(value.toString(), 18)
}

describe.only(`Buyback ERC20 test`, function(){
    let token;
    let tokenAddress
    let tokenName = 'BuybackTwo';

    let owner = ethers.provider.getSigner(0)
    let ownerAddress

    let pancake_router_address = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    let pancake_router;

    let WETH
    let pathB = []
    let pathS = []
    let decimals
    let provider

    let tempUser = ethers.provider.getSigner(1)
    let tempUserAddress

    it(`Test init`, async function(){
        ownerAddress = await owner.getAddress()
        tempUserAddress = await tempUser.getAddress()
        provider = new ethers.providers.JsonRpcProvider(`https://bsc.meowrpc.com`)
        console.log(`Owner address ${ownerAddress}, tempUser Address ${tempUserAddress}`)
    })

    it(`Deploying token and creating pair`, async function(){
        token = await (await (await ethers.getContractFactory(tokenName, owner)).deploy(pancake_router_address)).deployed()
        tokenAddress = token.address
        decimals = await token.decimals()

        console.log(`Token deployed to ${tokenAddress}`)
        console.log(`Token decimals ${decimals}`)
    })

    it(`Should add liquidity to pancakeswap`, async function(){
        let tokenToLiquidity = await token.balanceOf(ownerAddress)
        let amountTokenDesired  = tokenToLiquidity.toString()
        let amountTokenMin = amountTokenDesired
        let amountETHMin = ethers.utils.parseEther('1')
        let to = ownerAddress
        let deadLine = Date.now() + 60

        console.log(`Token to liquidity: ${tokenToLiquidity}\nAmount Token Desired: ${amountTokenDesired}\nAmount Token Min: ${amountTokenMin}\nAmount ETH min: ${amountETHMin}\nto: ${to}\ndeadline: ${deadLine}`)

        pancake_router = new ethers.Contract(pancake_router_address, pancake_router_abi, owner)
        let approve = await token.approve(pancake_router_address, ethers.constants.MaxUint256)

        const addLiquidity = await pancake_router.addLiquidityETH(
            tokenAddress, amountTokenDesired, amountTokenMin, amountETHMin, to, deadLine, {value: amountETHMin}
        )
        await addLiquidity.wait()
        console.log(`Liquidity added successfully`)

        WETH = await pancake_router.WETH()
        pathB = [WETH, tokenAddress]
        pathS = [tokenAddress, WETH]
        console.log(`WETH: ${WETH}\nPathBuy: ${pathB}\nPathSell: ${pathS}`)
    })

    it(`Should buy one time`, async function(){
        let tokenToBuy = parseUnits(20000000)
        console.log(`Buying ${tokenToBuy} tokens`)
        const amountsOut = await pancake_router.getAmountsIn(tokenToBuy, pathB);
        console.log(
            "amountsOut[0]: %s, amountsOut[1]: %s",
            amountsOut[0],
            amountsOut[1]
        ); 

        let bnbToBuy = amountsOut[0]
        console.log(`bnb to buy ${ethers.utils.formatEther(bnbToBuy.toString())}`)
        let deadLine = Date.now() + 60
        let userBalanceBefore = await token.balanceOf(tempUserAddress)
        console.log(`User balance before ${userBalanceBefore}`)
        let buy = await pancake_router.connect(tempUser).swapExactETHForTokensSupportingFeeOnTransferTokens(
            1,
            [pathB[0], pathB[1]],
            tempUserAddress,
            deadLine,
            { value: bnbToBuy }
        );
        await buy.wait()
        let userBalaceA = await token.balanceOf(tempUserAddress)
        console.log(`User balance after: ${userBalaceA}`)
    })

    it(`Should buy 10 times`, async function(){
        for(let i = 0; i < 10; i++){
            console.log(`\nIndex ${i}`)
            let tokenToBuy = parseUnits(20000000)
            console.log(`Buying ${tokenToBuy} tokens`)
            const amountsOut = await pancake_router.getAmountsIn(tokenToBuy, pathB);
            console.log(
                "amountsOut[0]: %s, amountsOut[1]: %s",
                amountsOut[0],
                amountsOut[1]
            ); 

            let bnbToBuy = amountsOut[0]
            console.log(`bnb to buy ${ethers.utils.formatEther(bnbToBuy.toString())}`)
            let deadLine = Date.now() + 60
            let userBalanceBefore = await token.balanceOf(tempUserAddress)
            console.log(`User balance before ${userBalanceBefore}`)
            let buy = await pancake_router.connect(tempUser).swapExactETHForTokensSupportingFeeOnTransferTokens(
                1,
                [pathB[0], pathB[1]],
                tempUserAddress,
                deadLine,
                { value: bnbToBuy }
            );
            await buy.wait()
            let userBalaceA = await token.balanceOf(tempUserAddress)
            console.log(`User balance after: ${userBalaceA}`)
        }
    })

    it(`Should make one sell`, async function(){
        let userBalBef = await token.balanceOf(tempUserAddress)
        console.log(`user balance before ${userBalBef}`)
        let approve = await token.connect(tempUser).approve(pancake_router_address, userBalBef)
        await approve.wait()
        let deadLine = Date.now() + 60
        let tokenToSell = parseUnits(20000000)
        console.log(`Selling ${tokenToSell} tokens`)
        const tx = await pancake_router.connect(tempUser).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenToSell,
            1,
            pathS,
            tempUserAddress,
            deadLine
          );
        await tx.wait();
        let userBalanceA = await token.balanceOf(tempUserAddress);
        console.log(`User balance after ${userBalanceA}`)
        let deadBalance = await token.balanceOf('0x000000000000000000000000000000000000dEaD')
        console.log(`dead balance: ${deadBalance}`)
    })

    it(`Should make 10 sells`, async function(){
        for(let i = 0; i < 10; i++){
            let userBalBef = await token.balanceOf(tempUserAddress)
            console.log(`user balance before ${userBalBef}`)
            let approve = await token.connect(tempUser).approve(pancake_router_address, userBalBef)
            await approve.wait()
            let deadLine = Date.now() + 60
            let tokenToSell = parseUnits(200000)
            console.log(`Selling ${tokenToSell} tokens`)
            const tx = await pancake_router.connect(tempUser).swapExactTokensForETHSupportingFeeOnTransferTokens(
                tokenToSell,
                1,
                pathS,
                tempUserAddress,
                deadLine
            );
            await tx.wait();
            let userBalanceA = await token.balanceOf(tempUserAddress);
            console.log(`User balance after ${userBalanceA}`)
            let deadBalance = await token.balanceOf('0x000000000000000000000000000000000000dEaD')
            console.log(`dead balance: ${deadBalance}`)
        }
    })
})