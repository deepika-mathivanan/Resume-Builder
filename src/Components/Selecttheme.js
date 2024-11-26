import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "./Selecttheme.css";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from 'react-redux';
import { getthemedata } from '../Redux/Reducers/themeReducer';
import axios from "axios";
import BounceLoader from 'react-spinners/BounceLoader';

function Selecttheme() {
    const [loading, setLoading] = useState(true);
    const themeredux = useSelector(state => state.theme);
    const userredux = useSelector(state => state.user.userdata);
    const prefill = themeredux.theme ? themeredux.theme : { themename: "", color: "" };
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [clickindex, Setclickindex] = useState("");
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        defaultValues: {
            theme: prefill.themename, color: prefill.color
        }
    });
    const [cardselect, Setcardselect] = useState("");
    const [themedata, Setthemedata] = useState([]);
    const [selected, Setselected] = useState(prefill.themename ? prefill : { themename: "", color: "" });

    const onSubmit = () => {
        dispatch(getthemedata(selected));
        navigate(`/theme-modern/download`);
    };

    const radioinputFunc = (e) => {
        if (e.target.checked) {
            Setcardselect("card-selected");
        }
    };

    const loadFunc = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    useEffect(() => {
        let isMounted = true; // Track component mount status

        async function getthemes() {
            try {
                const res = await axios.post(`http://localhost:4000/v1/graphql`, {
                    query: `query fetchtheme {
                        themes {
                            themename
                            img
                            colors
                            id
                        }
                    }`
                });

                if (!userredux.personal) {
                    navigate("/");
                }

                if (isMounted) {
                    Setthemedata(res.data.data.themes);
                    Setclickindex(prefill.themename ? res.data.data.themes.findIndex(e => e.themename === prefill.themename) : "");
                    Setcardselect("card-selected");
                    loadFunc();
                }

            } catch (error) {
                console.error("Error fetching themes:", error); // More informative error log
            }
        }

        getthemes();
        
        return () => { isMounted = false; }; // Cleanup on unmount
    }, [navigate, prefill.themename, userredux.personal]); // Added dependencies

    const resetColor = () => {
        setValue("color", "");
    };

    return (
        <>
            {loading ? 
                <BounceLoader className='loader' color="#643baa" size={150} /> :
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className='theme-header'>Select Theme</div>
                    <div className='theme-main'>
                        {themedata.map((item, index) => (
                            <div className={index === clickindex ? cardselect : ""} 
                                 onClick={() => { 
                                     Setclickindex(index); 
                                     Setselected(prev => ({ ...prev, themename: item.themename })); 
                                     Setcardselect("card-selected"); 
                                     resetColor(); 
                                 }} 
                                 key={index}>
                                <img src={`${process.env.REACT_APP_NHOST_BACKEND_URL}/v1/storage/files/${item.img}`} alt={item.themename} />
                                <div>{item.themename}</div>
                                <input type="radio" 
                                       {...register("theme", { required: true })} 
                                       value={item.themename} 
                                       checked={index === clickindex} 
                                       onClick={() => Setclickindex(index)} 
                                       onChange={radioinputFunc} 
                                       name="theme" />
                            </div>
                        ))}
                        <div className='theme-main-msg'>More themes will be available soon</div>
                    </div>
                    {errors.theme && <div className='theme-err'>Select the theme</div>}

                    {clickindex !== "" && (
                        <>
                            <div className='theme-header'>Select Theme Color</div>
                            <div className='clr-select'>
                                {themedata[clickindex].colors.split(",").map((color, index) => (
                                    <div key={index}>
                                        <input type="radio" 
                                               {...register("color", { required: true })} 
                                               value={color} 
                                               name="color" 
                                               onChange={(e) => Setselected(prev => ({ ...prev, color: e.target.value }))} />
                                        <div style={{ backgroundColor: color }}></div>
                                    </div>
                                ))}
                            </div>
                            {errors.color && <div className='theme-err'>Select the theme color</div>}
                        </>
                    )}

                    <div className='btn-div'>
                        <Link to="/resumebuild" className="link"><button type="button" className='btn'>Back</button></Link>
                        <button type='submit' className='btn'>Proceed</button>
                    </div>
                </form>
            }
        </>
    );
}

export default Selecttheme;
