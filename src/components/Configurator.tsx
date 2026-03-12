"use client";
import { useState, useMemo } from 'react';
import { Product, ModifierGroup, useCartStore } from "@/store/cartStore";

function ProductSuperscript({ allergens, additives }: { allergens?: string | null, additives?: string | null }) {
    const parts = [];
    if (additives) parts.push(...additives.split(',').map(s => s.trim()));
    if (allergens) parts.push(...allergens.split(',').map(s => s.trim()));
    
    if (parts.length === 0) return null;

    return (
        <sup className="text-[10px] ml-0.5 opacity-60 font-medium whitespace-nowrap">
            {parts.join(', ')}
        </sup>
    );
}

export default function Configurator({ product, onClose }: { product: Product, onClose: () => void }) {
    const { addItem, items } = useCartStore();
    const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({});

    const filteredModifierGroups = useMemo(() => {
        const hasDrinkInCart = items.some(item => 
            item.product.category?.name === 'Getränke' || 
            item.product.name.toLowerCase().includes('cola') ||
            item.product.name.toLowerCase().includes('fanta') ||
            item.product.name.toLowerCase().includes('ayran')
        );

        return (product.modifier_groups || []).filter(group => {
            if (group.name === 'Möchten Sie ein Getränk dazu?' && hasDrinkInCart) {
                return false;
            }
            return true;
        });
    }, [product.modifier_groups, items]);

    const modifierGroups = product.modifier_groups || [];


    const currentTotal = useMemo(() => {
        let total = Number(product.base_price);
        Object.values(selectedMods).flat().forEach(modId => {
            const group = modifierGroups.find(g => g.modifiers.some(m => m.id === modId));
            const modifier = group?.modifiers.find(m => m.id === modId);
            if (modifier) total += Number(modifier.price_delta);
        });
        return total;
    }, [product.base_price, selectedMods, modifierGroups]);

    const isValid = useMemo(() => {
        return modifierGroups.every(group => {
            if (!group.is_required) return true;
            const selections = selectedMods[group.id] || [];
            return selections.length > 0;
        });
    }, [modifierGroups, selectedMods]);

    const toggleModifier = (groupId: string, modifier: any, isSingleChoice: boolean) => {
        setSelectedMods(prev => {
            const currentSelections = prev[groupId] || [];
            if (isSingleChoice) {
                return { ...prev, [groupId]: [modifier.id] };
            }
            const isSelected = currentSelections.includes(modifier.id);
            if (isSelected) {
                return { ...prev, [groupId]: currentSelections.filter(id => id !== modifier.id) };
            } else {
                return { ...prev, [groupId]: [...currentSelections, modifier.id] };
            }
        });
    };

    const handleAddToCart = () => {
        addItem({
            product,
            product_id: product.id,
            quantity: 1,
            price: currentTotal,
            modifiers: selectedMods
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end sm:items-center">
            <div className="bg-[#fffdf9] w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden border-t-4 border-[#8b1a1a]">
                <div className="p-6 border-b border-[#ddd0b8]/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1008]">
                            {product.name}
                            <ProductSuperscript allergens={product.allergens} additives={product.additives} />
                        </h2>
                        <p className="text-[#5c4a32] text-sm mt-1">{product.description}</p>
                        {product.deposit_amount && product.deposit_amount > 0 && (
                            <p className="text-[10px] mt-1 font-bold opacity-70" style={{ color: "#8b1a1a" }}>
                                Inkl. {product.deposit_amount.toFixed(2)} € Pfand
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 bg-[#f5f0e8] hover:bg-[#eddfc8] rounded-full text-[#1a1008] transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#fcfaf5]">
                    {modifierGroups.map(group => {
                        const isSingleChoice = group.max_selections === 1;
                        const currentSelections = selectedMods[group.id] || [];

                        return (
                            <div key={group.id} className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="text-lg font-bold text-[#1a1008] uppercase tracking-wide text-xs opacity-60">{group.name}</h3>
                                    {group.is_required && currentSelections.length === 0 && (
                                        <span className="text-[10px] font-bold text-[#8b1a1a] bg-[#fde8e8] px-2 py-1 rounded-md uppercase tracking-wider">Erforderlich</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {group.modifiers.map(modifier => {
                                        const isSelected = currentSelections.includes(modifier.id);
                                        const priceString = Number(modifier.price_delta) > 0 ? `+ ${Number(modifier.price_delta).toFixed(2)} €` : '';

                                        return (
                                            <button
                                                key={modifier.id}
                                                onClick={() => toggleModifier(group.id, modifier, isSingleChoice)}
                                                className={`
                                                    flex justify-between items-center w-full p-4 rounded-xl border-2 transition-all text-left
                                                    ${isSelected
                                                        ? 'border-[#8b1a1a] bg-[#fcf4f4] shadow-sm'
                                                        : 'border-[#ddd0b8]/50 bg-white hover:border-[#ddd0b8]'
                                                    }
                                                `}
                                            >
                                                <span className={`text-sm ${isSelected ? 'font-bold text-[#8b1a1a]' : 'font-medium text-[#1a1008]'}`}>
                                                    {modifier.name}
                                                </span>

                                                <div className="flex items-center gap-3">
                                                    {priceString && (
                                                        <span className="text-xs font-bold" style={{ color: "#b8860b" }}>{priceString}</span>
                                                    )}
                                                    <div className={`
                                                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                                        ${isSelected ? 'border-[#8b1a1a] bg-[#8b1a1a]' : 'border-[#ddd0b8]'}
                                                    `}>
                                                        {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-[#ddd0b8] bg-[#fcfaf5] shadow-inner">
                    <button
                        disabled={!isValid}
                        onClick={handleAddToCart}
                        className={`
                            w-full py-4 rounded-xl text-sm font-bold transition-all flex justify-between px-6 items-center
                            ${isValid
                                ? 'bg-[#8b1a1a] text-white hover:opacity-90 active:scale-[0.98]'
                                : 'bg-[#ddd0b8] text-[#5c4a32]/50 cursor-not-allowed'
                            }
                        `}
                    >
                        <span>{isValid ? 'In den Warenkorb' : 'Auswahl vervollständigt'}</span>
                        <span className="text-lg">{currentTotal.toFixed(2)} €</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
