import { BigInt } from "@graphprotocol/graph-ts"
import {
  KeeperAuction,
  AuctionEnd,
  Bidded,
  Canceled,
  EndLocked,
  Refund
} from "../generated/KeeperAuction/KeeperAuction"
import {
  ERC20
} from "../generated/KeeperAuction/ERC20"
import { Bid, User } from "../generated/schema"

export function handleAuctionEnd(event: AuctionEnd): void {
  const auction = KeeperAuction.bind(event.address);

  const keepers = event.params.keepers;

  keepers.forEach(keeper => {
    const _user = auction.userBids(keeper);
    const user = User.load(keeper.toHex());

    user.amount = _user.value1;
    user.selected = true;
    user.save();
  });
}

export function handleBidded(event: Bidded): void {
  const token = ERC20.bind(event.params.token);

  let user = User.load(event.params.owner.toHex());
  if (user == null) {
    user = new User(event.params.owner.toHex());
    user.amount = new BigInt(0);
    user.selected = false;
    user.save();
  }

  let vAmount = event.params.amount;
  if (token.decimals() > 8) {
    vAmount = vAmount.div(new BigInt(10).pow(token.decimals() - 8));
  }

  let bid = new Bid(event.params.index.toString());
  bid.txHashBidded = event.transaction.hash;
  bid.timeBidded = event.block.timestamp;
  bid.token = event.params.token;
  bid.live = true;
  bid.amount = event.params.amount;
  bid.selectedAmount = new BigInt(0);
  bid.vAmount = vAmount;
  bid.owner = event.params.owner;
  bid.save();

  user.amount = user.amount.plus(vAmount);
  user.save();
}

export function handleCanceled(event: Refund | Canceled): void {
  const token = ERC20.bind(event.params.token);

  let bid = Bid.load(event.params.index.toString());
  bid.live = false;
  bid.txHashCanceled = event.transaction.hash;
  bid.timeCanceled = event.block.timestamp;
  bid.save();

  const user = User.load(event.params.owner.toHex());

  let vAmount = event.params.amount;
  if (token.decimals() > 8) {
    vAmount = vAmount.div(new BigInt(10).pow(token.decimals() - 8));
  }

  user.amount = user.amount.minus(vAmount);
  user.save();
}

export function handleEndLocked(event: EndLocked): void {
  // TODO
}
