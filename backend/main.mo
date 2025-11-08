import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor DrumMachine {
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var userPatterns : OrderedMap.Map<Principal, OrderedMap.Map<Text, [[Bool]]>> = principalMap.empty<OrderedMap.Map<Text, [[Bool]]>>();
  var userTempos : OrderedMap.Map<Principal, Nat> = principalMap.empty<Nat>();

  public type Pattern = [[Bool]];
  public type TrackName = Text;

  public func savePattern(user : Principal, patternName : Text, pattern : Pattern) : async () {
    let userPatternsMap = switch (principalMap.get(userPatterns, user)) {
      case null { textMap.empty<Pattern>() };
      case (?existing) { existing };
    };
    let updatedPatternsMap = textMap.put(userPatternsMap, patternName, pattern);
    userPatterns := principalMap.put(userPatterns, user, updatedPatternsMap);
  };

  public func getPattern(user : Principal, patternName : Text) : async ?Pattern {
    switch (principalMap.get(userPatterns, user)) {
      case null { null };
      case (?patternsMap) { textMap.get(patternsMap, patternName) };
    };
  };

  public func setTempo(user : Principal, tempo : Nat) : async () {
    userTempos := principalMap.put(userTempos, user, tempo);
  };

  public func getTempo(user : Principal) : async Nat {
    switch (principalMap.get(userTempos, user)) {
      case null { 120 };
      case (?tempo) { tempo };
    };
  };

  public func getDefaultPattern() : async Pattern {
    let emptyRow = Iter.toArray(Iter.map(Iter.range(0, 15), func(_ : Nat) : Bool { false }));
    Iter.toArray(Iter.map(Iter.range(0, 7), func(_ : Nat) : [Bool] { emptyRow }));
  };
};
