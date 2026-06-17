import streamlit as st
import requests

st.set_page_config(page_title="Spesade Dashboard", layout="wide", page_icon="🛒")

URL_BACKEND = "http://127.0.0.1:8000/api/v1"

# logo posizionato in cima alla sidebar
with st.sidebar:
    st.image("logo.svg", width=230, )
    st.write("---")
    # menu laterale di navigazione
    menu = st.selectbox("Navigazione", ["📦 Catalogo & Categorie", "📋 Gestione Liste Spesa"])

st.title("🛒 Spesade - L'inventario di Monade")

# CATALOGO E CATEGORIE
if menu == "📦 Catalogo & Categorie":

    tab_prodotti, tab_categorie = st.tabs(["🛒 Gestione Prodotti", "📁 Gestione Categorie"])
    
    # tab prodotti
    with tab_prodotti:
        st.header("Catalogo Prodotti")
        
        # prendiamo i prodotti e le categorie
        res_items = requests.get(f"{URL_BACKEND}/items/")
        res_cats = requests.get(f"{URL_BACKEND}/categories/")
        
        if res_items.status_code == 200 and res_cats.status_code == 200:
            prodotti = res_items.json()
            categorie = res_cats.json()
            cat_dict = {c["id"]: c["name"] for c in categorie}
            
            # tabella pulita senza id
            tabella_dati = []
            for p in prodotti:
                tabella_dati.append({
                    "Prodotto": p["name"],
                    "Categoria": cat_dict.get(p["category_id"], "N/A"),
                    "Target Dispensa": f"{p['target_quantity']} {p.get('unit', 'pz')}",
                    "Stato": "🟢 Attivo" if p.get("active", True) else "🔴 Disattivato"
                })
            
            if tabella_dati:
                st.dataframe(tabella_dati, width="stretch")
            else:
                st.info("Nessun prodotto nel catalogo.")
                
            st.write("---")
            
            col_add, col_manage = st.columns(2)
            
            # aggiungi prodotto
            with col_add:
                with st.expander("➕ Aggiungi Nuovo Prodotto"):
                    nome_p = st.text_input("Nome Prodotto")
                    cat_nomi = {c["name"]: c["id"] for c in categorie}
                    if cat_nomi:
                        scelta_cat = st.selectbox("Categoria:", list(cat_nomi.keys()))
                        target = st.number_input("Target:", min_value=1, value=5)
                        unita = st.text_input("Unità (pz, kg):", value="pz")
                        if st.button("Salva Prodotto"):
                            if nome_p:
                                payload = {"name": nome_p, "category_id": cat_nomi[scelta_cat], "target_quantity": target, "unit": unita}
                                requests.post(f"{URL_BACKEND}/items/", json=payload)
                                st.rerun()
                    else:
                        st.warning("Crea prima una categoria!")

            # modifica/elimina prodotto
            with col_manage:
                with st.expander("⚙️ Gestisci / Elimina Prodotto"):
                    if prodotti:
                        prod_dict = {f"{p['name']} ({'Attivo' if p.get('active', True) else 'Disatt.'})": p["id"] for p in prodotti}
                        scelta_modifica = st.selectbox("Seleziona prodotto:", list(prod_dict.keys()))
                        item_id_da_modificare = prod_dict[scelta_modifica]
                        
                        col_btn1, col_btn2 = st.columns(2)
                        with col_btn1:
                            if st.button("Attiva/Disattiva 🔄"):
                                requests.patch(f"{URL_BACKEND}/items/{item_id_da_modificare}/toggle-active")
                                st.rerun()
                        with col_btn2:
                            if st.button("Elimina 🗑️", type="primary"):
                                requests.delete(f"{URL_BACKEND}/items/{item_id_da_modificare}")
                                st.rerun()

    # tab categorie
    with tab_categorie:
        st.header("Categorie del Negozio")
        if res_cats.status_code == 200:
            categorie = res_cats.json()
            
            # tabella categorie senza id
            tab_cat = [{"Nome Categoria": c["name"]} for c in categorie]
            if tab_cat:
                st.table(tab_cat)
            else:
                st.info("Nessuna categoria.")
            
            st.write("---")
            col_add_c, col_man_c = st.columns(2)
            
            with col_add_c:
                with st.expander("➕ Aggiungi Categoria"):
                    nuova_c = st.text_input("Nome nuova categoria")
                    if st.button("Salva Categoria"):
                        requests.post(f"{URL_BACKEND}/categories/", json={"name": nuova_c})
                        st.rerun()
            
            # elimina categoria con controllo vincolo integrita
            with col_man_c:
                with st.expander("🗑️ Elimina Categoria"):
                    if categorie:
                        cat_dict_del = {c["name"]: c["id"] for c in categorie}
                        cat_da_elim = st.selectbox("Scegli categoria:", list(cat_dict_del.keys()))
                        if st.button("Elimina"):
                            res_del_c = requests.delete(f"{URL_BACKEND}/categories/{cat_dict_del[cat_da_elim]}")
                            if res_del_c.status_code == 200:
                                st.rerun()
                            else:
                                st.error("Impossibile eliminare: ci sono prodotti associati!")

# GESTIONE LISTA SPESA
elif menu == "📋 Gestione Liste Spesa":
    st.header("Ordini e Spesa")
    
    # selezione e creazione liste
    col_sel, col_crea = st.columns([2, 1], vertical_alignment="bottom")
    res_lists = requests.get(f"{URL_BACKEND}/lists/")
    liste = res_lists.json() if res_lists.status_code == 200 else []
    
    list_id = None
    lista_selezionata = None
    
    with col_sel:
        if liste:
            lista_selezionata_nome = st.selectbox("Seleziona una Lista:", [l["name"] for l in liste])
            lista_selezionata = next(l for l in liste if l["name"] == lista_selezionata_nome)
            list_id = lista_selezionata["id"]
        else:
            st.info("Crea la tua prima lista qui a destra ➡️")
            
    with col_crea:
        with st.expander("➕ Crea Nuova"):
            nuova_lista = st.text_input("Nome:")
            if st.button("Crea"):
                requests.post(f"{URL_BACKEND}/lists/", json={"name": nuova_lista})
                st.rerun()

    st.write("---")
    
    # dettaglio della lista selezionata
    if lista_selezionata and list_id:
        
        # status bar e cambio stato ordine
        st_col1, st_col2 = st.columns([1, 2])
        with st_col1:
            st.info(f"Stato: **{lista_selezionata['status'].upper()}**")
        with st_col2:
            stati = ["draft", "pending", "completed", "cancelled"]
            nuovo_stato = st.selectbox("Cambia stato:", stati, index=stati.index(lista_selezionata['status'].lower()), label_visibility="collapsed")
            if nuovo_stato != lista_selezionata['status'].lower():
                requests.patch(f"{URL_BACKEND}/lists/{list_id}/status", params={"new_status": nuovo_stato})
                st.rerun()
                
        # controllo dispensa e algoritmo automatico (solo se draft)
        if lista_selezionata['status'] == 'draft':
            with st.expander("🧠 Giro di ricognizione dispensa (Auto-Genera Spesa)"):
                res_all_items = requests.get(f"{URL_BACKEND}/items/")
                if res_all_items.status_code == 200:
                    catalogo = res_all_items.json()
                    with st.form(key="auto_gen"):
                        inv_input = {}
                        for item in catalogo:
                            if item.get("active", True):
                                inv_input[item["id"]] = st.number_input(f"{item['name']} (Target: {item['target_quantity']})", min_value=0, value=0)
                        if st.form_submit_button("Genera Lista 🚀"):
                            payload = {"inventory": [{"item_id": i_id, "current_quantity": qty} for i_id, qty in inv_input.items()]}
                            requests.post(f"{URL_BACKEND}/lists/{list_id}/auto-generate", json=payload)
                            st.rerun()

        # tabella dei prodotti calcolati (il carrello della spesa)
        st.subheader("🛒 Carrello")
        res_report = requests.get(f"{URL_BACKEND}/lists/{list_id}/items")
        if res_report.status_code == 200:
            prodotti_in_lista = res_report.json().get("products", [])
            
            if prodotti_in_lista:
                # tabella pulita senza id
                tab_carrello = []
                for pl in prodotti_in_lista:
                    tab_carrello.append({
                        "Prodotto": pl.get("product_name"),
                        "Quantità": pl.get("quantity"),
                        "Stato": "✅ Preso" if pl.get("bought") else "🛒 Da prendere"
                    })
                st.dataframe(tab_carrello, width="stretch")
                
                # spunta dei singoli prodotti messi nel carrello
                st.write("###### Segna come preso al supermercato:")
                
                # chiamata di supporto per recuperare gli id reali dei prodotti tramite mappa
                res_all_items = requests.get(f"{URL_BACKEND}/items/")
                if res_all_items.status_code == 200:
                    catalogo_completo = res_all_items.json()
                    mappa_nomi_id = {i["name"]: i["id"] for i in catalogo_completo}
                    
                    col_spunta, col_btn_spunta = st.columns([3, 1])
                    with col_spunta:
                        dict_spunta = {}
                        for p in prodotti_in_lista:
                            nome_prod = p['product_name']
                            id_reale = p.get('item_id') or mappa_nomi_id.get(nome_prod)
                            
                            if id_reale:
                                etichetta = f"{nome_prod} ({'✅ Preso' if p.get('bought') else '🛒 Da prendere'})"
                                dict_spunta[etichetta] = id_reale
                                
                        if dict_spunta:
                            item_da_spuntare = st.selectbox("Prodotto:", list(dict_spunta.keys()), label_visibility="collapsed")
                        else:
                            st.warning("Nessun prodotto valido da spuntare.")
                            
                    with col_btn_spunta:
                        if dict_spunta and st.button("Spunta / Rimuovi Spunta ✔️"):
                            requests.patch(f"{URL_BACKEND}/lists/{list_id}/items/{dict_spunta[item_da_spuntare]}/toggle-bought")
                            st.rerun()
            else:
                st.warning("Lista vuota. Usa il giro di ricognizione qui sopra per popolarla.")
                
        if lista_selezionata['status'] == 'draft':
            if st.button("🗑️ Svuota intera lista", type="primary"):
                requests.delete(f"{URL_BACKEND}/lists/{list_id}/clear")
                st.rerun()